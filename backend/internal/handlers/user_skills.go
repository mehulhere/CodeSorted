package handlers

import (
	"context"
	"fmt"
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

// GetUserSkills returns the skill profile for a specific user
func GetUserSkills(w http.ResponseWriter, r *http.Request) {
	// Extract username from URL path: /api/users/{username}/skills
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 4 {
		utils.SendJSONError(w, "Invalid URL path", http.StatusBadRequest)
		return
	}
	username := pathParts[2] // ["api", "users", "{username}", "skills"]

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

	// Look up skill profile from the user_skills collection
	skillsCollection := database.GetCollection("OJ", "user_skills")
	var skillsProfile models.UserSkillsProfile

	err = skillsCollection.FindOne(context.TODO(), bson.M{"user_id": user.ID}).Decode(&skillsProfile)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			// If no profile exists, return empty profile
			skillsProfile = models.UserSkillsProfile{
				UserID:        user.ID,
				Username:      user.Username,
				Skills:        []models.UserSkill{},
				LastUpdatedAt: time.Now(),
			}
		} else {
			utils.SendJSONError(w, "Database error finding skills profile", http.StatusInternalServerError)
			return
		}
	}

	utils.SendJSONResponse(w, http.StatusOK, skillsProfile)
}

// calculateSkillLevel determines the skill level based on problem counts
func calculateSkillLevel(problemsSolved, easyCount, mediumCount, hardCount int) models.SkillLevel {
	if hardCount >= 10 || problemsSolved >= 50 {
		return models.SkillLevelExpert
	} else if hardCount >= 5 || mediumCount >= 15 || problemsSolved >= 30 {
		return models.SkillLevelAdvanced
	} else if mediumCount >= 5 || problemsSolved >= 15 {
		return models.SkillLevelIntermediate
	}
	return models.SkillLevelBeginner
}

// UpdateUserSkill updates the skill statistics for a user after a submission
func UpdateUserSkill(userID primitive.ObjectID, problemID string, tags []string, difficulty string, accepted bool) error {
	if !accepted || len(tags) == 0 {
		return nil // Only update skills for accepted submissions with tags
	}

	ctx := context.Background()

	// Get the user
	userCollection := database.GetCollection("OJ", "users")
	var user models.User
	err := userCollection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		return err
	}
	fmt.Println("user:", user)
	// Get skills profile for the user
	skillsCollection := database.GetCollection("OJ", "user_skills")
	var skillsProfile models.UserSkillsProfile

	err = skillsCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&skillsProfile)
	if err != nil && err != mongo.ErrNoDocuments {
		return err
	}

	// If no profile exists, create a new one
	if err == mongo.ErrNoDocuments {
		skillsProfile = models.UserSkillsProfile{
			UserID:        userID,
			Username:      user.Username,
			Skills:        []models.UserSkill{},
			LastUpdatedAt: time.Now(),
		}
	}

	fmt.Println("user_id:", userID)

	// Check if this problem was already counted (to avoid double counting)
	submissionCollection := database.GetCollection("OJ", "submissions")

	query := bson.M{
		"user_id":    userID,
		"problem_id": problemID,
		"status":     models.StatusAccepted,
	}

	fmt.Println("Checking submissions with query:", query)

	count, err := submissionCollection.CountDocuments(ctx, query)

	fmt.Println("count of accepted submissions:", count)
	if err != nil {
		return err
	}

	// If problem already solved, just update the LastPracticed time
	if count > 1 {
		for i, skill := range skillsProfile.Skills {
			for _, tag := range tags {
				if skill.SkillName == tag {
					skillsProfile.Skills[i].LastPracticed = time.Now()
					fmt.Println("Problem already solved:", skill.SkillName)
				}
			}
		}
	} else {
		// Update skills for each tag
		for _, tag := range tags {
			// Find if skill already exists
			skillFound := false
			for i, skill := range skillsProfile.Skills {
				if skill.SkillName == tag {
					// Increment problem count based on difficulty
					skillsProfile.Skills[i].ProblemsSolved++
					switch difficulty {
					case "Easy":
						skillsProfile.Skills[i].EasyCount++
					case "Medium":
						skillsProfile.Skills[i].MediumCount++
					case "Hard":
						skillsProfile.Skills[i].HardCount++
					}

					// Recalculate skill level
					skillsProfile.Skills[i].Level = calculateSkillLevel(
						skillsProfile.Skills[i].ProblemsSolved,
						skillsProfile.Skills[i].EasyCount,
						skillsProfile.Skills[i].MediumCount,
						skillsProfile.Skills[i].HardCount,
					)

					skillsProfile.Skills[i].LastPracticed = time.Now()
					skillFound = true
					break
				}
			}

			// If skill not found, create new entry
			if !skillFound {
				var easyCount, mediumCount, hardCount int
				switch difficulty {
				case "Easy":
					easyCount = 1
				case "Medium":
					mediumCount = 1
				case "Hard":
					hardCount = 1
				}

				newSkill := models.UserSkill{
					ID:             primitive.NewObjectID(),
					UserID:         userID,
					Username:       user.Username,
					SkillName:      tag,
					Level:          calculateSkillLevel(1, easyCount, mediumCount, hardCount),
					ProblemsSolved: 1,
					EasyCount:      easyCount,
					MediumCount:    mediumCount,
					HardCount:      hardCount,
					LastPracticed:  time.Now(),
				}
				skillsProfile.Skills = append(skillsProfile.Skills, newSkill)
			}
		}
	}

	skillsProfile.LastUpdatedAt = time.Now()

	// Save updates
	opts := options.Update().SetUpsert(true)
	_, err = skillsCollection.UpdateOne(
		ctx,
		bson.M{"user_id": userID},
		bson.M{"$set": skillsProfile},
		opts,
	)

	return err
}

// AdminGenerateSkillStats creates test skill statistics for development/testing
func AdminGenerateSkillStats(w http.ResponseWriter, r *http.Request) {
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

	// Define test skill data
	skills := []struct {
		name         string
		problemCount int
		easyCount    int
		mediumCount  int
		hardCount    int
	}{
		{"Dynamic Programming", 16, 4, 9, 3},
		{"Backtracking", 8, 2, 5, 1},
		{"Arrays", 12, 8, 3, 1},
		{"Graphs", 5, 1, 3, 1},
		{"Binary Search", 7, 2, 4, 1},
	}

	// Create skill profile
	var userSkills []models.UserSkill

	for _, skill := range skills {
		level := calculateSkillLevel(skill.problemCount, skill.easyCount, skill.mediumCount, skill.hardCount)

		userSkills = append(userSkills, models.UserSkill{
			ID:             primitive.NewObjectID(),
			UserID:         targetUser.ID,
			Username:       targetUser.Username,
			SkillName:      skill.name,
			Level:          level,
			ProblemsSolved: skill.problemCount,
			EasyCount:      skill.easyCount,
			MediumCount:    skill.mediumCount,
			HardCount:      skill.hardCount,
			LastPracticed:  time.Now().AddDate(0, 0, -int(time.Now().Weekday())),
		})
	}

	// Create/update skill profile document
	skillsCollection := database.GetCollection("OJ", "user_skills")
	skillsProfile := models.UserSkillsProfile{
		UserID:        targetUser.ID,
		Username:      targetUser.Username,
		Skills:        userSkills,
		LastUpdatedAt: time.Now(),
	}

	// Insert or update document
	opts := options.Update().SetUpsert(true)
	_, err = skillsCollection.UpdateOne(
		context.TODO(),
		bson.M{"user_id": targetUser.ID},
		bson.M{"$set": skillsProfile},
		opts,
	)

	if err != nil {
		utils.SendJSONError(w, "Failed to generate skill stats", http.StatusInternalServerError)
		return
	}

	utils.SendJSONResponse(w, http.StatusOK, map[string]interface{}{
		"message":    "Test skill stats generated successfully",
		"username":   targetUser.Username,
		"skillCount": len(skills),
	})
}
