package handlers

import (
	"context"
	"net/http"
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

// GetUserLanguages returns the language statistics for a specific user
func GetUserLanguages(w http.ResponseWriter, r *http.Request) {
	// Extract username from URL path: /api/users/{username}/languages
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 4 {
		utils.SendJSONError(w, "Invalid URL path", http.StatusBadRequest)
		return
	}
	username := pathParts[2] // ["api", "users", "{username}", "languages"]

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

	// Look up language stats from the user_languages collection
	langCollection := database.GetCollection("OJ", "user_languages")
	var langStats models.UserLanguageStats

	err = langCollection.FindOne(context.TODO(), bson.M{"user_id": user.ID}).Decode(&langStats)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			// If no stats exist, return empty stats
			langStats = models.UserLanguageStats{
				UserID:           user.ID,
				Username:         user.Username,
				Languages:        []models.UserLanguage{},
				TotalSubmissions: 0,
				LastUpdatedAt:    time.Now(),
			}
		} else {
			utils.SendJSONError(w, "Database error finding language stats", http.StatusInternalServerError)
			return
		}
	}

	utils.SendJSONResponse(w, http.StatusOK, langStats)
}

// UpdateUserLanguageStats updates the language statistics for a user after a submission
func UpdateUserLanguageStats(userID primitive.ObjectID, language string, status models.SubmissionStatus) error {
	ctx := context.Background()

	// Get the user
	userCollection := database.GetCollection("OJ", "users")
	var user models.User
	err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		return err
	}

	// Get language stats for the user
	languageCollection := database.GetCollection("OJ", "user_languages")
	var langStats models.UserLanguageStats

	err = languageCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&langStats)
	if err != nil && err != mongo.ErrNoDocuments {
		return err
	}

	// If no stats exist, create a new entry
	if err == mongo.ErrNoDocuments {
		langStats = models.UserLanguageStats{
			UserID:           userID,
			Username:         user.Username,
			Languages:        []models.UserLanguage{},
			TotalSubmissions: 0,
			LastUpdatedAt:    time.Now(),
		}
	}

	// Update total submissions
	langStats.TotalSubmissions++

	// Find or create language entry
	languageFound := false
	for i, lang := range langStats.Languages {
		if lang.Language == language {
			// Update existing language stats
			langStats.Languages[i].SubmissionCount++
			langStats.Languages[i].LastUsed = time.Now()

			if status == models.StatusAccepted {
				langStats.Languages[i].AcceptedCount++
			}

			languageFound = true
			break
		}
	}

	// If language not found, add it
	if !languageFound {
		newLang := models.UserLanguage{
			ID:              primitive.NewObjectID(),
			UserID:          userID,
			Username:        user.Username,
			Language:        language,
			SubmissionCount: 1,
			AcceptedCount: func() int {
				if status == models.StatusAccepted {
					return 1
				}
				return 0
			}(),
			LastUsed: time.Now(),
		}
		langStats.Languages = append(langStats.Languages, newLang)
	}

	// Recalculate percentages
	for i := range langStats.Languages {
		langStats.Languages[i].PercentageOfTotal = float64(langStats.Languages[i].SubmissionCount) / float64(langStats.TotalSubmissions) * 100
	}

	langStats.LastUpdatedAt = time.Now()

	// Save updates
	opts := options.Update().SetUpsert(true)
	_, err = languageCollection.UpdateOne(
		ctx,
		bson.M{"user_id": userID},
		bson.M{"$set": langStats},
		opts,
	)

	return err
}

// AdminGenerateLanguageStats creates test language statistics for development/testing
func AdminGenerateLanguageStats(w http.ResponseWriter, r *http.Request) {
	// Verify admin access
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

	// Extract target username from query params
	targetUsername := r.URL.Query().Get("username")
	if targetUsername == "" {
		utils.SendJSONError(w, "Username parameter is required", http.StatusBadRequest)
		return
	}

	// Find target user
	var targetUser models.User
	err = userCollection.FindOne(context.TODO(), bson.M{"username": targetUsername}).Decode(&targetUser)
	if err != nil {
		utils.SendJSONError(w, "Target user not found", http.StatusNotFound)
		return
	}

	// Define test language data
	languages := []struct {
		name         string
		submissions  int
		acceptedRate float64
	}{
		{"C++", 97, 0.85},
		{"Java", 9, 0.67},
		{"Python", 2, 1.0},
		{"JavaScript", 39, 0.72},
	}

	// Create language stats object
	totalSubmissions := 0
	var userLanguages []models.UserLanguage

	for _, lang := range languages {
		totalSubmissions += lang.submissions
		accepted := int(float64(lang.submissions) * lang.acceptedRate)

		userLanguages = append(userLanguages, models.UserLanguage{
			ID:                primitive.NewObjectID(),
			UserID:            targetUser.ID,
			Username:          targetUser.Username,
			Language:          lang.name,
			SubmissionCount:   lang.submissions,
			AcceptedCount:     accepted,
			PercentageOfTotal: 0,                                                    // Will be calculated below
			LastUsed:          time.Now().AddDate(0, 0, -int(time.Now().Weekday())), // Set to beginning of week
		})
	}

	// Calculate percentages
	for i := range userLanguages {
		userLanguages[i].PercentageOfTotal = float64(userLanguages[i].SubmissionCount) / float64(totalSubmissions) * 100
	}

	// Create/update language stats document
	languageCollection := database.GetCollection("OJ", "user_languages")
	languageStats := models.UserLanguageStats{
		UserID:           targetUser.ID,
		Username:         targetUser.Username,
		Languages:        userLanguages,
		TotalSubmissions: totalSubmissions,
		LastUpdatedAt:    time.Now(),
	}

	// Insert or update document
	opts := options.Update().SetUpsert(true)
	_, err = languageCollection.UpdateOne(
		context.TODO(),
		bson.M{"user_id": targetUser.ID},
		bson.M{"$set": languageStats},
		opts,
	)

	if err != nil {
		utils.SendJSONError(w, "Failed to generate language stats", http.StatusInternalServerError)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, map[string]interface{}{
		"message":          "Test language stats generated successfully",
		"username":         targetUser.Username,
		"languageCount":    len(languages),
		"totalSubmissions": totalSubmissions,
	})
}
