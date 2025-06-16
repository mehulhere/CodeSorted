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

// RecordCheckin records a daily check-in for the authenticated user
func RecordCheckin(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context (set by auth middleware)
	userID, ok := r.Context().Value("userID").(primitive.ObjectID)
	if !ok {
		utils.SendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	status, err := recordCheckinInternal(r.Context(), userID)
	if err != nil {
		utils.SendJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if status == "already_checked_in" {
		utils.SendJSONResponse(w, http.StatusOK, map[string]interface{}{
			"message": "Already checked in today",
			"status":  "already_checked_in",
		})
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, map[string]interface{}{
		"message": "Check-in recorded successfully",
		"status":  "success",
		"date":    time.Now().UTC().Format("2006-01-02"),
	})
}

// recordCheckinInternal contains the core logic for recording a daily check-in
func recordCheckinInternal(ctx context.Context, userID primitive.ObjectID) (string, error) {
	// Get user information
	userCollection := database.GetCollection("OJ", "users")
	var user models.User
	err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		return "", err
	}

	// Get today's date in UTC
	now := time.Now().UTC()
	dateString := now.Format("2006-01-02") // YYYY-MM-DD format

	// Check if the user has already checked in today
	checkinCollection := database.GetCollection("OJ", "user_checkins")
	count, err := checkinCollection.CountDocuments(ctx, bson.M{
		"user_id":     userID,
		"date_string": dateString,
	})
	if err != nil {
		return "", err
	}

	if count > 0 {
		return "already_checked_in", nil
	}

	// Record new check-in
	checkin := models.UserCheckin{
		UserID:     userID,
		Username:   user.Username,
		CheckinAt:  now,
		DateString: dateString,
	}

	_, err = checkinCollection.InsertOne(ctx, checkin)
	if err != nil {
		return "", err
	}

	// Update user's streak information
	if err := UpdateUserStreak(userID); err != nil {
		return "", err
	}

	return "success", nil
}

// GetUserCheckinHistory returns a user's check-in history for the last year
func GetUserCheckinHistory(w http.ResponseWriter, r *http.Request) {
	// Extract username from URL path: /api/users/{username}/checkins
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 4 {
		utils.SendJSONError(w, "Invalid URL path", http.StatusBadRequest)
		return
	}
	username := pathParts[2] // ["api", "users", "{username}", "checkins"]

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

	// Calculate date range (1 year ago to today)
	now := time.Now().UTC()
	oneYearAgo := now.AddDate(-1, 0, 0)

	// Query for all check-ins within the date range
	checkinCollection := database.GetCollection("OJ", "user_checkins")
	opts := options.Find().SetSort(bson.D{{"checkin_at", 1}})
	cursor, err := checkinCollection.Find(
		context.TODO(),
		bson.M{
			"user_id": user.ID,
			"checkin_at": bson.M{
				"$gte": oneYearAgo,
				"$lte": now,
			},
		},
		opts,
	)
	if err != nil {
		utils.SendJSONError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(context.TODO())

	// Create map of check-in dates
	checkinDays := make(map[string]bool)
	for cursor.Next(context.TODO()) {
		var checkin models.UserCheckin
		if err := cursor.Decode(&checkin); err != nil {
			utils.SendJSONError(w, "Error decoding checkin data", http.StatusInternalServerError)
			return
		}
		checkinDays[checkin.DateString] = true
	}

	history := models.UserCheckinHistory{
		UserID:      user.ID,
		Username:    user.Username,
		CheckinDays: checkinDays,
	}

	utils.SendJSONResponse(w, http.StatusOK, history)
}

// UpdateUserStreak updates a user's streak information based on their check-in history
func UpdateUserStreak(userID primitive.ObjectID) error {
	ctx := context.Background()
	checkinCollection := database.GetCollection("OJ", "user_checkins")
	userStatsCollection := database.GetCollection("OJ", "user_stats")

	// Get all check-ins sorted by date (oldest first)
	opts := options.Find().SetSort(bson.D{{"checkin_at", 1}})
	cursor, err := checkinCollection.Find(ctx, bson.M{"user_id": userID}, opts)
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	var checkins []models.UserCheckin
	if err = cursor.All(ctx, &checkins); err != nil {
		return err
	}

	// Calculate current streak and max streak
	currentStreak := 0
	maxStreak := 0
	var lastCheckinDate time.Time

	// Start with today's date
	today := time.Now().UTC().Truncate(24 * time.Hour)
	yesterday := today.AddDate(0, 0, -1)

	for i := len(checkins) - 1; i >= 0; i-- {
		checkinDate := checkins[i].CheckinAt.Truncate(24 * time.Hour)

		// If this is the most recent check-in
		if i == len(checkins)-1 {
			// Check if the most recent check-in is today or yesterday
			if checkinDate.Equal(today) || checkinDate.Equal(yesterday) {
				currentStreak = 1
				lastCheckinDate = checkinDate
			} else {
				// The streak is broken if the most recent check-in is older than yesterday
				break
			}
		} else {
			// Check if this check-in is consecutive with the last one
			expectedDate := lastCheckinDate.AddDate(0, 0, -1)
			if checkinDate.Equal(expectedDate) {
				currentStreak++
				lastCheckinDate = checkinDate
			} else {
				// Streak is broken
				break
			}
		}
	}

	// Calculate max streak
	tempStreak := 0
	var tempLastDate time.Time

	for i, checkin := range checkins {
		checkinDate := checkin.CheckinAt.Truncate(24 * time.Hour)

		if i == 0 {
			tempStreak = 1
			tempLastDate = checkinDate
		} else {
			expectedDate := tempLastDate.AddDate(0, 0, 1)
			if checkinDate.Equal(expectedDate) {
				tempStreak++
				tempLastDate = checkinDate
			} else {
				// Reset streak if broken
				if tempStreak > maxStreak {
					maxStreak = tempStreak
				}
				tempStreak = 1
				tempLastDate = checkinDate
			}
		}
	}

	// Check final streak
	if tempStreak > maxStreak {
		maxStreak = tempStreak
	}

	// Update user stats with streak information
	update := bson.M{
		"$set": bson.M{
			"current_streak": currentStreak,
			"max_streak":     maxStreak,
		},
	}

	opts2 := options.Update().SetUpsert(true)
	_, err = userStatsCollection.UpdateOne(ctx, bson.M{"user_id": userID}, update, opts2)
	return err
}

// AdminGenerateTestCheckins creates test check-in data for development/testing
func AdminGenerateTestCheckins(w http.ResponseWriter, r *http.Request) {
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

	// Generate check-ins for the past 365 days with some randomness
	// This is for testing purposes only
	checkinCollection := database.GetCollection("OJ", "user_checkins")

	// First, remove any existing check-ins for this user
	_, err = checkinCollection.DeleteMany(context.TODO(), bson.M{"user_id": targetUser.ID})
	if err != nil {
		utils.SendJSONError(w, "Failed to clear existing check-ins", http.StatusInternalServerError)
		return
	}

	// Pattern: Generate a realistic check-in pattern
	// - Generate a 30-day streak
	// - Skip a few days
	// - Generate a 15-day streak
	// - Skip a week
	// - Generate scattered check-ins

	now := time.Now().UTC()
	checkinsCreated := 0

	// Recent 30-day streak (ending today or yesterday)
	for i := 0; i < 30; i++ {
		checkInDate := now.AddDate(0, 0, -i)
		dateString := checkInDate.Format("2006-01-02")

		checkin := models.UserCheckin{
			UserID:     targetUser.ID,
			Username:   targetUser.Username,
			CheckinAt:  checkInDate,
			DateString: dateString,
		}

		_, err = checkinCollection.InsertOne(context.TODO(), checkin)
		if err != nil {
			continue // Skip errors
		}
		checkinsCreated++
	}

	// Skip 5 days

	// 15-day streak
	for i := 35; i < 50; i++ {
		checkInDate := now.AddDate(0, 0, -i)
		dateString := checkInDate.Format("2006-01-02")

		checkin := models.UserCheckin{
			UserID:     targetUser.ID,
			Username:   targetUser.Username,
			CheckinAt:  checkInDate,
			DateString: dateString,
		}

		_, err = checkinCollection.InsertOne(context.TODO(), checkin)
		if err != nil {
			continue
		}
		checkinsCreated++
	}

	// Scattered check-ins throughout the year
	for i := 60; i < 365; i += 3 {
		// Add some randomness - skip some days
		if i%7 == 0 {
			continue
		}

		checkInDate := now.AddDate(0, 0, -i)
		dateString := checkInDate.Format("2006-01-02")

		checkin := models.UserCheckin{
			UserID:     targetUser.ID,
			Username:   targetUser.Username,
			CheckinAt:  checkInDate,
			DateString: dateString,
		}

		_, err = checkinCollection.InsertOne(context.TODO(), checkin)
		if err != nil {
			continue
		}
		checkinsCreated++
	}

	// Update user's streak information
	UpdateUserStreak(targetUser.ID)

	utils.SendJSONResponse(w, http.StatusOK, map[string]interface{}{
		"message":         "Test check-ins generated successfully",
		"checkinsCreated": checkinsCreated,
		"targetUsername":  targetUser.Username,
	})
}
