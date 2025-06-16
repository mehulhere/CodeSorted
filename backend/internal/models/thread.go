package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Thread represents a discussion thread for a problem
type Thread struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ProblemID   string             `json:"problem_id" bson:"problem_id"`     // Problem ID this thread belongs to
	UserID      primitive.ObjectID `json:"user_id" bson:"user_id"`           // User who created the thread
	Title       string             `json:"title" bson:"title"`               // Thread title
	Content     string             `json:"content" bson:"content"`           // Thread content/description
	Upvotes     int                `json:"upvotes" bson:"upvotes"`           // Number of upvotes
	Downvotes   int                `json:"downvotes" bson:"downvotes"`       // Number of downvotes
	CommentCount int               `json:"comment_count" bson:"comment_count"` // Cached comment count
	CreatedAt   time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at" bson:"updated_at"`
	IsLocked    bool               `json:"is_locked" bson:"is_locked"`       // Whether thread is locked for comments
}

// ThreadListItem represents a simplified thread for listing
type ThreadListItem struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Title        string             `json:"title" bson:"title"`
	Content      string             `json:"content" bson:"content"`
	Upvotes      int                `json:"upvotes" bson:"upvotes"`
	CommentCount int                `json:"comment_count" bson:"comment_count"`
	CreatedAt    time.Time          `json:"created_at" bson:"created_at"`
	Username     string             `json:"username" bson:"username"`         // Author's username
	IsLocked     bool               `json:"is_locked" bson:"is_locked"`
}

// CreateThreadPayload represents the payload for creating a new thread
type CreateThreadPayload struct {
	ProblemID string `json:"problem_id" binding:"required"`
	Title     string `json:"title" binding:"required"`
	Content   string `json:"content" binding:"required"`
}