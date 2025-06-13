package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ProblemStats holds the aggregated complexity statistics for a single problem.
type ProblemStats struct {
	ID                           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ProblemID                    string             `json:"problem_id" bson:"problem_id"` // The string ID like "two-sum"
	TotalAcceptedSubmissions     int                `json:"total_accepted_submissions" bson:"total_accepted_submissions"`
	TimeComplexityDistribution   map[string]int     `json:"time_complexity_distribution" bson:"time_complexity_distribution"`
	MemoryComplexityDistribution map[string]int     `json:"memory_complexity_distribution" bson:"memory_complexity_distribution"`
	LastUpdatedAt                time.Time          `json:"last_updated_at" bson:"last_updated_at"`
}
