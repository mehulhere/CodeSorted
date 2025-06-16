package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"backend/internal/database"
	"backend/internal/models"
	"backend/internal/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func GetProfile(w http.ResponseWriter, r *http.Request) {
	// Extract username from URL path: /api/users/{username}/profile
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 4 {
		utils.SendJSONError(w, "Invalid URL path", http.StatusBadRequest)
		return
	}
	username := pathParts[2] // ["api", "users", "{username}", "profile"]
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

	var profile models.Profile
	profileCollection := database.GetCollection("OJ", "profiles")
	err = profileCollection.FindOne(context.TODO(), bson.M{"userId": user.ID}).Decode(&profile)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			// If profile doesn't exist, create a default one
			profile = models.Profile{
				UserID: user.ID,
			}
			_, insertErr := profileCollection.InsertOne(context.TODO(), profile)
			if insertErr != nil {
				utils.SendJSONError(w, "Failed to create profile", http.StatusInternalServerError)
				return
			}
		} else {
			utils.SendJSONError(w, "Database error finding profile", http.StatusInternalServerError)
			return
		}
	}

	utils.SendJSONResponse(w, http.StatusOK, profile)
}

func GetUser(w http.ResponseWriter, r *http.Request) {
	// Extract username from URL path: /api/users/{username}
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 3 {
		utils.SendJSONError(w, "Invalid URL path", http.StatusBadRequest)
		return
	}
	username := pathParts[2] // ["api", "users", "{username}"]
	fmt.Println(username)
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

	// Return public user data (don't include sensitive info like password)
	publicUser := map[string]interface{}{
		"username":   user.Username,
		"firstname":  user.Firstname,
		"lastname":   user.Lastname,
		"created_at": user.CreatedAt,
	}

	utils.SendJSONResponse(w, http.StatusOK, publicUser)
}

func UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("userID").(primitive.ObjectID)
	if !ok {
		utils.SendJSONError(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	var profileUpdates models.Profile
	if err := json.NewDecoder(r.Body).Decode(&profileUpdates); err != nil {
		utils.SendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	profileCollection := database.GetCollection("OJ", "profiles")
	update := bson.M{
		"$set": bson.M{
			"bio":      profileUpdates.Bio,
			"location": profileUpdates.Location,
			"website":  profileUpdates.Website,
		},
	}

	_, err := profileCollection.UpdateOne(context.TODO(), bson.M{"userId": userID}, update)
	if err != nil {
		utils.SendJSONError(w, "Failed to update profile", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
