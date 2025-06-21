package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"backend/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

var DB *mongo.Client

func ConnectDB(uri string) error {

	// Set a Timeout of 10s
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if uri == "" {
		uri = "mongodb://localhost:27017"
	}

	// Set uri and any other options
	clientOptions := options.Client().ApplyURI(uri)

	// Connect to mongo with these options
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		log.Printf("Failed to connect to MongoDB: %v", err)
		return err
	}

	// Ping the MongoDB server to verify the connection
	err = client.Ping(ctx, readpref.Primary()) // readpref.Primary() reads the primary node of the database
	if err != nil {
		log.Printf("Failed to ping MongoDB: %v", err)
		if client != nil {
			disconnectErr := client.Disconnect(context.Background()) // Sent a new context without timeout
			if disconnectErr != nil {
				log.Printf("Failed to disconnect client after ping failure: %v", disconnectErr)
			}
		}
		return err // This returns the ping error
	}

	DB = client
	fmt.Println("Successfully connected to MongoDB!")

	// Ensure unique indexes
	err = EnsureUniqueIndex("OJ", "users", "username")
	if err != nil {
		log.Printf("Failed to ensure unique username index: %v. This may cause issues with duplicate usernames.", err)
	}

	err = EnsureUniqueIndex("OJ", "users", "email")
	if err != nil {
		log.Printf("Failed to ensure unique email index: %v. This may cause issues with duplicate emails.", err)
	}

	return nil
}

// Function to ensure a unique index on a specified field
func EnsureUniqueIndex(dbName string, collectionName string, fieldKey string) error {
	if DB == nil {
		return fmt.Errorf("mongodb client is not initialized")
	}

	collection := DB.Database(dbName).Collection(collectionName)

	// Create a unique index on the specified field
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: fieldKey, Value: 1}}, // Index on the specified field and sort in ascending
		Options: options.Index().SetUnique(true),   // Uniqueness option
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := collection.Indexes().CreateOne(ctx, indexModel)
	if err != nil {
		// Check if the error is due to the index already existing
		if mongo.IsDuplicateKeyError(err) {
			fmt.Printf("Unique index on '%s' already exists.\n", fieldKey)
			return nil // Index already exists, consider it successful
		}
		return fmt.Errorf("failed to create unique index on '%s': %v", fieldKey, err)
	}

	fmt.Printf("Successfully created unique index on '%s'.\n", fieldKey)

	return nil
}

func GetCollection(dbName string, collectionName string) *mongo.Collection {
	if DB == nil {
		log.Fatal("MongoDB client is not initiazed. Call Connect DB first.")
		return nil
	}

	collection := DB.Database(dbName).Collection(collectionName)
	return collection
}

type GeneratedCode struct {
	ProblemID        string    `bson:"problem_id"`
	Language         string    `bson:"language"`
	InputParserCode  string    `bson:"input_parser_code"`
	SolutionCode     string    `bson:"solution_code"`
	OutputParserCode string    `bson:"output_parser_code"`
	CreatedAt        time.Time `bson:"created_at"`
}

func SaveGeneratedCode(ctx context.Context, problemID, language, inputParser, solution, outputParser string) error {
	if DB == nil {
		return fmt.Errorf("mongodb client is not initialized")
	}

	collection := GetCollection("OJ", "problem_artifacts")

	// Create a new document with the generated code
	codeDoc := GeneratedCode{
		ProblemID:        problemID,
		Language:         language,
		InputParserCode:  inputParser,
		SolutionCode:     solution,
		OutputParserCode: outputParser,
		CreatedAt:        time.Now(),
	}

	// Use upsert to either insert a new document or update an existing one
	opts := options.Update().SetUpsert(true)
	filter := bson.M{"problem_id": problemID, "language": language}
	update := bson.M{"$set": codeDoc}

	_, err := collection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		return fmt.Errorf("failed to save generated code for problem %s: %w", problemID, err)
	}

	log.Printf("Successfully saved generated code for problem %s and language %s", problemID, language)
	return nil
}

func GetGeneratedCode(ctx context.Context, problemID, language string) (*GeneratedCode, error) {
	if DB == nil {
		return nil, fmt.Errorf("mongodb client is not initialized")
	}

	collection := GetCollection("OJ", "problem_artifacts")
	filter := bson.M{"problem_id": problemID, "language": language}

	var result GeneratedCode
	err := collection.FindOne(ctx, filter).Decode(&result)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("no generated code found for problem_id: %s and language: %s", problemID, language)
		}
		return nil, fmt.Errorf("failed to fetch generated code: %w", err)
	}

	return &result, nil
}

func DisconnectDB() {
	if DB == nil {
		return
	}

	// Creating a 5s timeout for Disconnect too
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	err := DB.Disconnect(ctx)
	if err != nil {
		log.Fatalf("Failed to disconnect from MongoDB: %v", err)
	}
	fmt.Println("Connection to MongoDB closed.")
}

// SaveProblem creates or updates a problem in the database.
func SaveProblem(ctx context.Context, problem *models.Problem) error {
	collection := GetCollection("OJ", "problems")

	// Set timestamps
	now := time.Now()
	if problem.ID.IsZero() {
		problem.CreatedAt = now
	}
	problem.UpdatedAt = now

	// Use upsert to either insert a new problem or update an existing one based on problem_id
	opts := options.Update().SetUpsert(true)
	filter := bson.M{"problem_id": problem.ProblemID}
	update := bson.M{"$set": problem}

	_, err := collection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		log.Printf("Error saving problem to database: %v", err)
		return fmt.Errorf("failed to save problem: %w", err)
	}

	log.Printf("Successfully saved problem with ID: %s", problem.ProblemID)
	return nil
}

// GetProblemByID retrieves a single problem from the database by its custom problem_id.
func GetProblemByID(ctx context.Context, problemID string) (*models.Problem, error) {
	if DB == nil {
		return nil, fmt.Errorf("mongodb client is not initialized")
	}

	collection := GetCollection("OJ", "problems")
	filter := bson.M{"problem_id": problemID}

	var result models.Problem
	err := collection.FindOne(ctx, filter).Decode(&result)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("no problem found for problem_id: %s", problemID)
		}
		return nil, fmt.Errorf("failed to fetch problem: %w", err)
	}

	return &result, nil
}
