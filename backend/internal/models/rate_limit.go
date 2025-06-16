package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// RateLimitedService represents different services that require rate limiting
type RateLimitedService string

const (
	ServiceCodeCompletion   RateLimitedService = "code_completion"
	ServicePseudocodeToCode RateLimitedService = "pseudocode_to_code"
	ServiceCodeExecution    RateLimitedService = "code_execution"
	ServiceCodeSubmission   RateLimitedService = "code_submission"
	ServiceAIAnalysis       RateLimitedService = "ai_analysis"
	ServiceGuestCreation    RateLimitedService = "guest_creation"
	ServiceAIHint           RateLimitedService = "ai_hint"
)

// ServiceLimit defines the rate limits for a specific service
type ServiceLimit struct {
	Service         RateLimitedService `json:"service" bson:"service"`
	MaxRequests     int                `json:"max_requests" bson:"max_requests"`           // Maximum number of requests in the time window
	WindowMinutes   int                `json:"window_minutes" bson:"window_minutes"`       // Time window in minutes
	CurrentCount    int                `json:"current_count" bson:"current_count"`         // Current count of requests in the window
	WindowStartedAt time.Time          `json:"window_started_at" bson:"window_started_at"` // When the current window started
	LastRequestAt   time.Time          `json:"last_request_at" bson:"last_request_at"`     // Timestamp of the last request
}

// RateLimit defines the structure for tracking rate limits per user
type RateLimit struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID    primitive.ObjectID `json:"user_id" bson:"user_id"`       // User ID for whom rate limits are tracked
	Username  string             `json:"username" bson:"username"`     // Username for easier queries and logging
	IsAdmin   bool               `json:"is_admin" bson:"is_admin"`     // Admin users may have different rate limits
	Services  []ServiceLimit     `json:"services" bson:"services"`     // Rate limits for different services
	CreatedAt time.Time          `json:"created_at" bson:"created_at"` // When the rate limit tracking was created
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"` // Last time any service limit was updated
}

// DefaultRateLimits returns the default rate limits for a new user
func DefaultRateLimits(isAdmin bool) []ServiceLimit {
	now := time.Now()

	// Higher limits for admin users
	if isAdmin {
		return []ServiceLimit{
			{Service: ServiceCodeCompletion, MaxRequests: 1000, WindowMinutes: 60, CurrentCount: 0, WindowStartedAt: now, LastRequestAt: now},
			{Service: ServicePseudocodeToCode, MaxRequests: 100, WindowMinutes: 60, CurrentCount: 0, WindowStartedAt: now, LastRequestAt: now},
			{Service: ServiceCodeExecution, MaxRequests: 200, WindowMinutes: 60, CurrentCount: 0, WindowStartedAt: now, LastRequestAt: now},
			{Service: ServiceCodeSubmission, MaxRequests: 200, WindowMinutes: 60, CurrentCount: 0, WindowStartedAt: now, LastRequestAt: now},
			{Service: ServiceAIAnalysis, MaxRequests: 100, WindowMinutes: 60, CurrentCount: 0, WindowStartedAt: now, LastRequestAt: now},
			{Service: ServiceAIHint, MaxRequests: 50, WindowMinutes: 60, CurrentCount: 0, WindowStartedAt: now, LastRequestAt: now},
		}
	}

	// Regular user limits
	return []ServiceLimit{
		{Service: ServiceCodeCompletion, MaxRequests: 100, WindowMinutes: 60, CurrentCount: 0, WindowStartedAt: now, LastRequestAt: now},
		{Service: ServicePseudocodeToCode, MaxRequests: 20, WindowMinutes: 60, CurrentCount: 0, WindowStartedAt: now, LastRequestAt: now},
		{Service: ServiceCodeExecution, MaxRequests: 50, WindowMinutes: 60, CurrentCount: 0, WindowStartedAt: now, LastRequestAt: now},
		{Service: ServiceCodeSubmission, MaxRequests: 50, WindowMinutes: 60, CurrentCount: 0, WindowStartedAt: now, LastRequestAt: now},
		{Service: ServiceAIAnalysis, MaxRequests: 20, WindowMinutes: 60, CurrentCount: 0, WindowStartedAt: now, LastRequestAt: now},
		{Service: ServiceAIHint, MaxRequests: 10, WindowMinutes: 60, CurrentCount: 0, WindowStartedAt: now, LastRequestAt: now},
	}
}

// RateLimitStats provides a summary of rate limit usage for the client
type RateLimitStats struct {
	Service      string    `json:"service"`
	RemainingUse int       `json:"remaining_use"`
	ResetAt      time.Time `json:"reset_at"`
	LimitPerHour int       `json:"limit_per_hour"`
}
