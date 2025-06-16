package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"backend/internal/database"
	"backend/internal/models"
	"backend/internal/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// GetUserDiscussionCount returns the total number of discussions (threads + comments) for a specific user
func GetUserDiscussionCount(w http.ResponseWriter, r *http.Request) {
	// Extract username from URL path: /api/users/{username}/discussion-count
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 4 {
		utils.SendJSONError(w, "Invalid URL path", http.StatusBadRequest)
		return
	}
	username := pathParts[2] // ["api", "users", "{username}", "discussion-count"]

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

	fmt.Println(user.ID)
	// Count discussion threads by the user
	threadsCollection := database.GetCollection("OJ", "threads")
	threadCount, err := threadsCollection.CountDocuments(context.TODO(), bson.M{"user_id": user.ID})
	if err != nil {
		utils.SendJSONError(w, "Database error counting threads", http.StatusInternalServerError)
		return
	}
	fmt.Println(threadCount)

	// Count comments by the user
	commentsCollection := database.GetCollection("OJ", "comments")
	commentCount, err := commentsCollection.CountDocuments(context.TODO(), bson.M{"user_id": user.ID})
	if err != nil {
		utils.SendJSONError(w, "Database error counting comments", http.StatusInternalServerError)
		return
	}

	totalDiscussions := threadCount + commentCount

	utils.SendJSONResponse(w, http.StatusOK, map[string]interface{}{
		"total_discussions": totalDiscussions,
	})
}
