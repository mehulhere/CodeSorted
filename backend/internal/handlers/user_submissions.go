package handlers

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend/internal/database"
	"backend/internal/models"
	"backend/internal/utils"

	"log"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// RecentSubmission represents a simplified submission record for display
type RecentSubmission struct {
	ID            string    `json:"id"`
	ProblemID     string    `json:"problem_id"`
	ProblemTitle  string    `json:"problem_title"`
	Status        string    `json:"status"`
	Language      string    `json:"language"`
	SubmittedAt   time.Time `json:"submitted_at"`
	TimestampText string    `json:"timestamp"`
	Difficulty    string    `json:"difficulty"`
}

// formatTimestamp formats a time.Time into a user-friendly string like "3 days ago"
func formatTimestamp(t time.Time) string {
	duration := time.Since(t)

	seconds := int(duration.Seconds())
	minutes := seconds / 60
	hours := minutes / 60
	days := hours / 24
	months := days / 30
	years := days / 365

	if years > 0 {
		if years == 1 {
			return "1 year ago"
		}
		return strconv.Itoa(years) + " years ago"
	}
	if months > 0 {
		if months == 1 {
			return "1 month ago"
		}
		return strconv.Itoa(months) + " months ago"
	}
	if days > 0 {
		if days == 1 {
			return "1 day ago"
		}
		return strconv.Itoa(days) + " days ago"
	}
	if hours > 0 {
		if hours == 1 {
			return "1 hour ago"
		}
		return strconv.Itoa(hours) + " hours ago"
	}
	if minutes > 0 {
		if minutes == 1 {
			return "1 minute ago"
		}
		return strconv.Itoa(minutes) + " minutes ago"
	}

	return "just now"
}

// GetUserRecentSubmissions returns the recent submissions for a user
func GetUserRecentSubmissions(w http.ResponseWriter, r *http.Request) {
	// Extract username from URL path: /api/users/{username}/submissions
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 4 {
		utils.SendJSONError(w, "Invalid URL path", http.StatusBadRequest)
		return
	}
	username := pathParts[2] // ["api", "users", "{username}", "submissions"]

	// Add debug logging
	log.Printf("Getting submissions for user: %s", username)

	// Parse limit parameter, default to 10
	limitStr := r.URL.Query().Get("limit")
	limit := 5
	if limitStr != "" {
		var err error
		limit, err = strconv.Atoi(limitStr)
		if err != nil || limit < 1 {
			limit = 5
		}
		if limit > 50 {
			limit = 50 // Cap at 50 to prevent excessive queries
		}
	}

	// Find the user by username
	var user models.User
	userCollection := database.GetCollection("OJ", "users")
	err := userCollection.FindOne(context.TODO(), bson.M{"username": username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.SendJSONError(w, "User not found", http.StatusNotFound)
			return
		}
		utils.SendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Add debug logging
	log.Printf("Found user with ID: %s", user.ID.Hex())

	// Get submissions from the database
	submissionCollection := database.GetCollection("OJ", "submissions")
	problemCollection := database.GetCollection("OJ", "problems")

	// Set up find options
	findOptions := options.Find()
	findOptions.SetSort(bson.M{"submitted_at": -1}) // Sort by submission time, newest first
	findOptions.SetLimit(int64(limit))

	// Query for submissions
	cursor, err := submissionCollection.Find(
		context.TODO(),
		bson.M{"user_id": user.ID},
		findOptions,
	)

	if err != nil {
		utils.SendJSONError(w, "Failed to retrieve submissions", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(context.TODO())

	// Add debug logging
	log.Printf("Executing query for submissions with user_id: %s", user.ID.Hex())

	// Decode submissions and join with problem information
	var recentSubmissions []RecentSubmission

	for cursor.Next(context.TODO()) {
		var submission models.Submission
		if err = cursor.Decode(&submission); err != nil {
			log.Printf("Error decoding submission: %v", err)
			continue
		}

		// Add debug logging
		log.Printf("Found submission: %+v", submission)

		// Look up problem details using problem_id field
		var problem models.Problem
		err = problemCollection.FindOne(context.TODO(), bson.M{"problem_id": submission.ProblemID}).Decode(&problem)
		if err != nil {
			// Skip if problem not found
			log.Printf("Error finding problem with problem_id %s: %v", submission.ProblemID, err)
			continue
		}

		// Add debug logging
		log.Printf("Found problem: %s - %s", problem.ProblemID, problem.Title)

		// Format the submission for display
		recentSubmission := RecentSubmission{
			ID:            submission.ID.Hex(),
			ProblemID:     submission.ProblemID,
			ProblemTitle:  problem.Title,
			Status:        string(submission.Status),
			Language:      submission.Language,
			SubmittedAt:   submission.SubmittedAt,
			TimestampText: formatTimestamp(submission.SubmittedAt),
			Difficulty:    problem.Difficulty,
		}

		recentSubmissions = append(recentSubmissions, recentSubmission)
	}

	if err = cursor.Err(); err != nil {
		utils.SendJSONError(w, "Error processing submissions", http.StatusInternalServerError)
		return
	}

	// Return empty array if no submissions found
	if recentSubmissions == nil {
		recentSubmissions = []RecentSubmission{}
	}

	utils.SendJSONResponse(w, http.StatusOK, recentSubmissions)
}
