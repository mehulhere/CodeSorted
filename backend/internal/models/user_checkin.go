package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// UserCheckin tracks a user's daily check-in to the platform
type UserCheckin struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID    primitive.ObjectID `json:"user_id" bson:"user_id"`
	Username  string             `json:"username" bson:"username"`
	CheckinAt time.Time          `json:"checkin_at" bson:"checkin_at"`
	// Store date as YYYY-MM-DD string for easier querying
	DateString string `json:"date_string" bson:"date_string"`
}

// UserCheckinHistory represents a year of check-in data for a user
type UserCheckinHistory struct {
	UserID   primitive.ObjectID `json:"user_id" bson:"user_id"`
	Username string             `json:"username" bson:"username"`
	// Map of date strings (YYYY-MM-DD) to boolean values indicating check-in status
	CheckinDays map[string]bool `json:"checkin_days" bson:"checkin_days"`
}
