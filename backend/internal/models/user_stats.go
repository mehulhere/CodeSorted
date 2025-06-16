package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// UserStats holds the problem-solving statistics for a user
type UserStats struct {
	ID               primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID           primitive.ObjectID `json:"user_id" bson:"user_id"`
	Username         string             `json:"username" bson:"username"`
	TotalSolved      int                `json:"total_solved" bson:"total_solved"`
	EasySolved       int                `json:"easy_solved" bson:"easy_solved"`
	MediumSolved     int                `json:"medium_solved" bson:"medium_solved"`
	HardSolved       int                `json:"hard_solved" bson:"hard_solved"`
	TotalSubmissions int                `json:"total_submissions" bson:"total_submissions"`
	AcceptanceRate   float64            `json:"acceptance_rate" bson:"acceptance_rate"`
	Ranking          int                `json:"ranking" bson:"ranking"`
	TotalUsers       int                `json:"total_users" bson:"total_users"`
	MaxStreak        int                `json:"max_streak" bson:"max_streak"`
	CurrentStreak    int                `json:"current_streak" bson:"current_streak"`
	LastUpdatedAt    time.Time          `json:"last_updated_at" bson:"last_updated_at"`
}
