package database

import (
	"context"
	"fmt"
	"log"
	"time"

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
