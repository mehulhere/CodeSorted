package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend/internal/database"
	"backend/internal/models"
	"backend/internal/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// GetUserStats returns the stats for a specific user
func GetUserStats(w http.ResponseWriter, r *http.Request) {
	// Extract username from URL path: /api/users/{username}/stats
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 4 {
		utils.SendJSONError(w, "Invalid URL path", http.StatusBadRequest)
		return
	}
	username := pathParts[2] // ["api", "users", "{username}", "stats"]

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

	// Look up user stats from the user_stats collection
	userStatsCollection := database.GetCollection("OJ", "user_stats")
	var userStats models.UserStats
	err = userStatsCollection.FindOne(context.TODO(), bson.M{"user_id": user.ID}).Decode(&userStats)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			// If no stats exist, create default stats for the user
			totalUsers, _ := userCollection.CountDocuments(context.TODO(), bson.M{})

			userStats = models.UserStats{
				UserID:           user.ID,
				Username:         user.Username,
				TotalSolved:      0,
				EasySolved:       0,
				MediumSolved:     0,
				HardSolved:       0,
				TotalSubmissions: 0,
				AcceptanceRate:   0,
				Ranking:          int(totalUsers), // Default to lowest rank
				TotalUsers:       int(totalUsers),
				MaxStreak:        0,
				CurrentStreak:    0,
				LastUpdatedAt:    time.Now(),
			}

			_, insertErr := userStatsCollection.InsertOne(context.TODO(), userStats)
			if insertErr != nil {
				utils.SendJSONError(w, "Failed to create user stats", http.StatusInternalServerError)
				return
			}
		} else {
			utils.SendJSONError(w, "Database error finding user stats", http.StatusInternalServerError)
			return
		}
	}

	utils.SendJSONResponse(w, http.StatusOK, userStats)
}

// UpdateUserStats recalculates and updates user statistics
// This should be called after a submission is processed
func UpdateUserStats(userID primitive.ObjectID) error {
	ctx := context.Background()

	// Get the user
	userCollection := database.GetCollection("OJ", "users")
	var user models.User
	err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		return err
	}

	// Get submission data
	submissionCollection := database.GetCollection("OJ", "submissions")
	problemCollection := database.GetCollection("OJ", "problems")

	// Count total submissions
	totalSubmissions, err := submissionCollection.CountDocuments(ctx, bson.M{"user_id": userID})
	if err != nil {
		return err
	}

	// Count accepted submissions
	acceptedSubmissions, err := submissionCollection.CountDocuments(ctx,
		bson.M{
			"user_id": userID,
			"status":  models.StatusAccepted,
		})
	if err != nil {
		return err
	}

	// Calculate acceptance rate
	var acceptanceRate float64 = 0
	if totalSubmissions > 0 {
		acceptanceRate = float64(acceptedSubmissions) / float64(totalSubmissions) * 100
	}

	// Get unique solved problems (count only unique problem_id with status ACCEPTED)
	pipeline := mongo.Pipeline{
		{{"$match", bson.M{"user_id": userID, "status": models.StatusAccepted}}},
		{{"$group", bson.M{"_id": "$problem_id"}}},
		{{"$count", "count"}},
	}

	cursor, err := submissionCollection.Aggregate(ctx, pipeline)
	if err != nil {
		return err
	}

	var totalSolvedResult struct {
		Count int `bson:"count"`
	}

	totalSolved := 0
	if cursor.Next(ctx) {
		if err := cursor.Decode(&totalSolvedResult); err == nil {
			totalSolved = totalSolvedResult.Count
		}
	}

	// Get count by difficulty
	easySolved := 0
	mediumSolved := 0
	hardSolved := 0

	// Get unique solved problem IDs
	pipeline = mongo.Pipeline{
		{{"$match", bson.M{"user_id": userID, "status": models.StatusAccepted}}},
		{{"$group", bson.M{"_id": "$problem_id"}}},
	}

	cursor, err = submissionCollection.Aggregate(ctx, pipeline)
	if err != nil {
		return err
	}

	var solvedProblemIDs []string
	for cursor.Next(ctx) {
		var result struct {
			ID string `bson:"_id"`
		}
		if err := cursor.Decode(&result); err == nil {
			solvedProblemIDs = append(solvedProblemIDs, result.ID)
		}
	}

	// Count problems by difficulty
	if len(solvedProblemIDs) > 0 {
		// Easy
		easyCount, _ := problemCollection.CountDocuments(ctx,
			bson.M{
				"problem_id": bson.M{"$in": solvedProblemIDs},
				"difficulty": "Easy",
			})
		easySolved = int(easyCount)

		// Medium
		mediumCount, _ := problemCollection.CountDocuments(ctx,
			bson.M{
				"problem_id": bson.M{"$in": solvedProblemIDs},
				"difficulty": "Medium",
			})
		mediumSolved = int(mediumCount)

		// Hard
		hardCount, _ := problemCollection.CountDocuments(ctx,
			bson.M{
				"problem_id": bson.M{"$in": solvedProblemIDs},
				"difficulty": "Hard",
			})
		hardSolved = int(hardCount)
	}

	// Log calculated stats before updating
	log.Printf("Updating stats for user %s: TotalSolved=%d, Easy=%d, Medium=%d, Hard=%d, TotalSubmissions=%d, AcceptanceRate=%.2f",
		user.Username, totalSolved, easySolved, mediumSolved, hardSolved, totalSubmissions, acceptanceRate)

	// Calculate ranking (for simplicity, this is a very basic ranking system)
	// Get all users with their total solved count for ranking
	userStatsCollection := database.GetCollection("OJ", "user_stats")

	// Count total users
	totalUsers, _ := userCollection.CountDocuments(ctx, bson.M{})

	// Update or create user stats
	update := bson.M{
		"$set": bson.M{
			"username":          user.Username,
			"total_solved":      totalSolved,
			"easy_solved":       easySolved,
			"medium_solved":     mediumSolved,
			"hard_solved":       hardSolved,
			"total_submissions": totalSubmissions,
			"acceptance_rate":   acceptanceRate,
			"total_users":       int(totalUsers),
			"last_updated_at":   time.Now(),
		},
	}

	opts := options.Update().SetUpsert(true)
	_, err = userStatsCollection.UpdateOne(ctx,
		bson.M{"user_id": userID},
		update,
		opts)

	if err != nil {
		log.Printf("Error updating user stats for user %s: %v", user.Username, err)
	}

	// After updating the user's stats, recalculate rankings for all users
	go updateRankingsInBackground()

	return err
}

// updateRankingsInBackground updates the rankings for all users in a background goroutine
func updateRankingsInBackground() {
	if err := updateAllRankingsInternal(); err != nil {
		log.Printf("Error updating rankings in background: %v", err)
	}
}

// UpdateAllRankings updates the rankings for all users
// This should be called periodically, e.g., once a day
func UpdateAllRankings(w http.ResponseWriter, r *http.Request) {
	// Check if requester is an admin
	userID, ok := r.Context().Value("userID").(primitive.ObjectID)
	if !ok {
		utils.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var user models.User
	userCollection := database.GetCollection("OJ", "users")
	err := userCollection.FindOne(context.TODO(), bson.M{"_id": userID}).Decode(&user)
	if err != nil || !user.IsAdmin {
		utils.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Update all rankings
	err = updateAllRankingsInternal()
	if err != nil {
		utils.SendJSONError(w, fmt.Sprintf("Failed to update rankings: %v", err), http.StatusInternalServerError)
		return
	}

	// Get count of updated users
	userStatsCollection := database.GetCollection("OJ", "user_stats")
	count, _ := userStatsCollection.CountDocuments(context.TODO(), bson.M{})

	utils.SendJSONResponse(w, http.StatusOK, map[string]interface{}{
		"message": "Rankings updated successfully",
		"count":   count,
	})
}

// GetRankingsHandler returns the top users ranked by problems solved
func GetRankingsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendJSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse limit parameter, default to 100
	limitStr := r.URL.Query().Get("limit")
	limit := 100
	if limitStr != "" {
		var err error
		limit, err = strconv.Atoi(limitStr)
		if err != nil || limit < 1 {
			limit = 100
		}
		if limit > 1000 {
			limit = 1000 // Cap at 1000 to prevent excessive queries
		}
	}

	// Parse skip parameter for pagination, default to 0
	skipStr := r.URL.Query().Get("skip")
	skip := 0
	if skipStr != "" {
		var err error
		skip, err = strconv.Atoi(skipStr)
		if err != nil || skip < 0 {
			skip = 0
		}
	}

	// Get user stats sorted by ranking
	userStatsCollection := database.GetCollection("OJ", "user_stats")
	opts := options.Find().
		SetSort(bson.D{{"ranking", 1}}). // Sort by ranking (ascending)
		SetLimit(int64(limit)).
		SetSkip(int64(skip))

	cursor, err := userStatsCollection.Find(context.TODO(), bson.M{}, opts)
	if err != nil {
		utils.SendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(context.TODO())

	// Decode results
	var rankings []struct {
		Username     string `json:"username"`
		Ranking      int    `json:"ranking"`
		TotalSolved  int    `json:"total_solved"`
		EasySolved   int    `json:"easy_solved"`
		MediumSolved int    `json:"medium_solved"`
		HardSolved   int    `json:"hard_solved"`
	}

	for cursor.Next(context.TODO()) {
		var stats models.UserStats
		if err = cursor.Decode(&stats); err != nil {
			continue
		}

		ranking := struct {
			Username     string `json:"username"`
			Ranking      int    `json:"ranking"`
			TotalSolved  int    `json:"total_solved"`
			EasySolved   int    `json:"easy_solved"`
			MediumSolved int    `json:"medium_solved"`
			HardSolved   int    `json:"hard_solved"`
		}{
			Username:     stats.Username,
			Ranking:      stats.Ranking,
			TotalSolved:  stats.TotalSolved,
			EasySolved:   stats.EasySolved,
			MediumSolved: stats.MediumSolved,
			HardSolved:   stats.HardSolved,
		}

		rankings = append(rankings, ranking)
	}

	if err = cursor.Err(); err != nil {
		utils.SendJSONError(w, "Error processing user stats", http.StatusInternalServerError)
		return
	}

	// Return empty array if no rankings found
	if rankings == nil {
		rankings = []struct {
			Username     string `json:"username"`
			Ranking      int    `json:"ranking"`
			TotalSolved  int    `json:"total_solved"`
			EasySolved   int    `json:"easy_solved"`
			MediumSolved int    `json:"medium_solved"`
			HardSolved   int    `json:"hard_solved"`
		}{}
	}

	utils.SendJSONResponse(w, http.StatusOK, rankings)
}

// ForceUpdateRankings updates the rankings for all users without requiring admin privileges
func ForceUpdateRankings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		utils.SendJSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	err := updateAllRankingsInternal()
	if err != nil {
		utils.SendJSONError(w, fmt.Sprintf("Failed to update rankings: %v", err), http.StatusInternalServerError)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, map[string]interface{}{
		"message": "Rankings updated successfully",
	})
}

// updateAllRankingsInternal updates the rankings for all users
func updateAllRankingsInternal() error {
	ctx := context.Background()

	// Get all users with their stats, sorted by total_solved (descending)
	userStatsCollection := database.GetCollection("OJ", "user_stats")
	opts := options.Find().SetSort(bson.D{{"total_solved", -1}})
	cursor, err := userStatsCollection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return fmt.Errorf("database error: %v", err)
	}
	defer cursor.Close(ctx)

	// Update rankings
	var userStats []models.UserStats
	if err = cursor.All(ctx, &userStats); err != nil {
		return fmt.Errorf("error decoding user stats: %v", err)
	}

	// Bulk update rankings
	for i, stats := range userStats {
		rank := i + 1 // Rankings start at 1
		_, err = userStatsCollection.UpdateOne(
			ctx,
			bson.M{"_id": stats.ID},
			bson.M{"$set": bson.M{"ranking": rank}},
		)
		if err != nil {
			return fmt.Errorf("error updating ranking for user %s: %v", stats.Username, err)
		}
	}

	log.Printf("Rankings updated for %d users", len(userStats))
	return nil
}
