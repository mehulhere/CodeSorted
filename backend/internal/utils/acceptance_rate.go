package utils

import (
	"backend/internal/models"
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// CalculateAcceptanceRate calculates the percentage of accepted submissions for a problem
func CalculateAcceptanceRate(ctx context.Context, submissionsCollection *mongo.Collection, problemID string) (float64, error) {
	// Count total submissions for this problem
	totalFilter := bson.M{"problem_id": problemID}
	totalCount, err := submissionsCollection.CountDocuments(ctx, totalFilter)
	if err != nil {
		return 0, fmt.Errorf("error counting total submissions: %v", err)
	}

	if totalCount == 0 {
		return 0, nil // No submissions yet
	}

	// Count accepted submissions for this problem
	acceptedFilter := bson.M{
		"problem_id": problemID,
		"status":     models.StatusAccepted,
	}
	acceptedCount, err := submissionsCollection.CountDocuments(ctx, acceptedFilter)
	if err != nil {
		return 0, fmt.Errorf("error counting accepted submissions: %v", err)
	}

	// Calculate and return acceptance rate as a percentage
	return float64(acceptedCount) / float64(totalCount) * 100, nil
}
