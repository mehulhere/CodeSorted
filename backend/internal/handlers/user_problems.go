package handlers

import (
	"context"
	"net/http"

	"backend/internal/database"
	"backend/internal/middleware"
	"backend/internal/models"
	"backend/internal/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type UserProblemStatusResponse struct {
	Solved     []string `json:"solved_problems"`
	Attempted  []string `json:"attempted_problems"`
	Bookmarked []string `json:"bookmarked_problems"`
}

func GetUserProblemStatusHandler(w http.ResponseWriter, r *http.Request) {
	// 1. Get UserID from context
	userID, ok := r.Context().Value(middleware.UserIDKey).(primitive.ObjectID)
	if !ok {
		utils.SendJSONError(w, "User not authenticated", http.StatusUnauthorized)
		return
	}

	// 2. Setup database collections
	submissionsCollection := database.GetCollection("OJ", "submissions")
	bookmarksCollection := database.GetCollection("OJ", "user_bookmarks")
	ctx := context.TODO()

	var response UserProblemStatusResponse

	// 3. Get Solved Problems
	solvedCursor, err := submissionsCollection.Distinct(ctx, "problem_id", bson.M{
		"user_id": userID,
		"status":  models.StatusAccepted,
	})
	if err == nil {
		for _, problemID := range solvedCursor {
			response.Solved = append(response.Solved, problemID.(string))
		}
	}

	// 4. Get Attempted Problems
	attemptedCursor, err := submissionsCollection.Distinct(ctx, "problem_id", bson.M{
		"user_id":    userID,
		"problem_id": bson.M{"$nin": response.Solved},
	})
	if err == nil {
		for _, problemID := range attemptedCursor {
			response.Attempted = append(response.Attempted, problemID.(string))
		}
	}

	// 5. Get Bookmarked Problems
	var bookmarks struct {
		ProblemIDs []string `bson:"problem_ids"`
	}
	err = bookmarksCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&bookmarks)
	if err != nil && err != mongo.ErrNoDocuments {
		// handle error
	} else if err == nil {
		response.Bookmarked = bookmarks.ProblemIDs
	}

	utils.SendJSONResponse(w, http.StatusOK, response)
}
