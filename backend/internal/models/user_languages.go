package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// UserLanguage represents the usage statistics for a single programming language by a user
type UserLanguage struct {
	ID                primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID            primitive.ObjectID `json:"user_id" bson:"user_id"`
	Username          string             `json:"username" bson:"username"`
	Language          string             `json:"language" bson:"language"`
	SubmissionCount   int                `json:"submission_count" bson:"submission_count"`
	AcceptedCount     int                `json:"accepted_count" bson:"accepted_count"`
	PercentageOfTotal float64            `json:"percentage_of_total" bson:"percentage_of_total"`
	LastUsed          time.Time          `json:"last_used" bson:"last_used"`
}

// UserLanguageStats represents a summary of all language statistics for a user
type UserLanguageStats struct {
	UserID           primitive.ObjectID `json:"user_id" bson:"user_id"`
	Username         string             `json:"username" bson:"username"`
	Languages        []UserLanguage     `json:"languages" bson:"languages"`
	TotalSubmissions int                `json:"total_submissions" bson:"total_submissions"`
	LastUpdatedAt    time.Time          `json:"last_updated_at" bson:"last_updated_at"`
}
