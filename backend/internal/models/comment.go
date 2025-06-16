package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Comment represents a comment in a discussion thread
type Comment struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ThreadID  primitive.ObjectID `json:"thread_id" bson:"thread_id"`       // Thread this comment belongs to
	UserID    primitive.ObjectID `json:"user_id" bson:"user_id"`           // User who made the comment
	Content   string             `json:"content" bson:"content"`           // Comment content
	Upvotes   int                `json:"upvotes" bson:"upvotes"`           // Number of upvotes
	Downvotes int                `json:"downvotes" bson:"downvotes"`       // Number of downvotes
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
	IsDeleted bool               `json:"is_deleted" bson:"is_deleted"`     // Soft delete flag
}

// CommentListItem represents a comment with user info for listing
type CommentListItem struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Content   string             `json:"content" bson:"content"`
	Upvotes   int                `json:"upvotes" bson:"upvotes"`
	Downvotes int                `json:"downvotes" bson:"downvotes"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
	Username  string             `json:"username" bson:"username"`         // Author's username
	IsDeleted bool               `json:"is_deleted" bson:"is_deleted"`
}

// CreateCommentPayload represents the payload for creating a new comment
type CreateCommentPayload struct {
	ThreadID string `json:"thread_id" binding:"required"`
	Content  string `json:"content" binding:"required"`
}

// Vote represents a user's vote on a thread or comment
type Vote struct {
	ID       primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID   primitive.ObjectID `json:"user_id" bson:"user_id"`
	TargetID primitive.ObjectID `json:"target_id" bson:"target_id"`       // ID of thread or comment
	Type     string             `json:"type" bson:"type"`                 // "thread" or "comment"
	Value    int                `json:"value" bson:"value"`               // 1 for upvote, -1 for downvote
	CreatedAt time.Time         `json:"created_at" bson:"created_at"`
}

// VotePayload represents the payload for voting
type VotePayload struct {
	TargetID string `json:"target_id" binding:"required"`
	Type     string `json:"type" binding:"required"`     // "thread" or "comment"
	Value    int    `json:"value" binding:"required"`    // 1 for upvote, -1 for downvote, 0 to remove vote
}