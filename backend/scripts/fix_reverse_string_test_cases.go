package main

import (
	"backend/internal/database"
	"backend/internal/models"
	"context"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using default environment variables")
	}

	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		log.Fatal("MONGO_URI must be set in your environment or .env file")
	}

	// Connect to the database
	if err := database.ConnectDB(mongoURI); err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer database.DisconnectDB()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	problemsCollection := database.GetCollection("OJ", "problems")
	testCasesCollection := database.GetCollection("OJ", "test_cases")

	// 1. Find the "Reverse String" problem to get its correct database ObjectID
	problemIDStr := "RS001"
	var problem models.Problem
	err := problemsCollection.FindOne(ctx, bson.M{"problem_id": problemIDStr}).Decode(&problem)
	if err != nil {
		log.Fatalf("Could not find problem with problem_id '%s': %v", problemIDStr, err)
	}

	correctProblemDBID := problem.ID
	log.Printf("Found problem '%s'. Correct DB ID is: %s", problem.Title, correctProblemDBID.Hex())

	// 2. Find test cases that are incorrectly linked or missing the link.
	// We'll assume they might have a "problem_id" field with the string "RS001"
	// but an incorrect or missing "problem_db_id".
	filter := bson.M{
		"$or": []bson.M{
			{"problem_id": problemIDStr},                            // Find by the string ID
			{"notes": bson.M{"$regex": "reverse", "$options": "i"}}, // Or find by notes as a fallback
		},
		"problem_db_id": bson.M{"$ne": correctProblemDBID}, // Only find docs that need updating
	}

	// 3. Update the found test cases with the correct problem_db_id
	update := bson.M{
		"$set": bson.M{
			"problem_db_id": correctProblemDBID,
			"updated_at":    time.Now(),
		},
	}

	updateResult, err := testCasesCollection.UpdateMany(ctx, filter, update)
	if err != nil {
		log.Fatalf("Failed to update test cases for problem '%s': %v", problemIDStr, err)
	}

	if updateResult.MatchedCount == 0 {
		log.Println("No test cases found that required fixing. They might already be correctly linked.")
		// Let's also check if any are linked correctly, for confirmation
		correctlyLinkedCount, err := testCasesCollection.CountDocuments(ctx, bson.M{"problem_db_id": correctProblemDBID})
		if err != nil {
			log.Printf("Could not count correctly linked documents: %v", err)
		} else {
			log.Printf("Found %d test cases already correctly linked to problem DB ID %s.", correctlyLinkedCount, correctProblemDBID.Hex())
		}
		return
	}

	log.Printf("Successfully updated %d test case(s) to be linked to problem '%s'.", updateResult.ModifiedCount, problem.Title)
	log.Println("The test cases should now appear correctly on the problem page.")
}
