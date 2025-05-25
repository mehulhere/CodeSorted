package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// TestCase defines the structure for a test case associated with a problem.
type TestCase struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ProblemDBID    primitive.ObjectID `json:"problem_db_id" bson:"problem_db_id"`     // Foreign key to the Problem's _id
	Input          string             `json:"input" bson:"input"`                     // The input data for the test case
	ExpectedOutput string             `json:"expected_output" bson:"expected_output"` // The expected output
	IsSample       bool               `json:"is_sample" bson:"is_sample"`             // Is this a sample test case visible to users?
	Points         int                `json:"points" bson:"points"`                   // Points awarded for passing this test case (e.g., for partial scoring)
	Notes          string             `json:"notes,omitempty" bson:"notes,omitempty"` // Optional notes: e.g., "Tests edge case: empty array", "Tests large inputs"
	SequenceNumber int                `json:"sequence_number" bson:"sequence_number"` // To maintain an order if needed
	CreatedAt      time.Time          `json:"created_at" bson:"created_at"`
	// Future considerations:
	// IsHidden bool `json:"is_hidden" bson:"is_hidden"` // Could replace/complement IsSample if more granularity is needed
	// TimeLimitMsOverride int `json:"time_limit_ms_override,omitempty" bson:"time_limit_ms_override,omitempty"` // If this TC has a specific time limit
	// MemoryLimitMBOverride int `json:"memory_limit_mb_override,omitempty" bson:"memory_limit_mb_override,omitempty"` // If this TC has a specific memory limit
}

// AddTestCasePayload defines the structure for the request body when adding a new test case.
// We might want to add Points and SequenceNumber to the payload as well.
type AddTestCasePayload struct {
	ProblemDBID    string `json:"problem_db_id"`
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected_output"`
	IsSample       bool   `json:"is_sample"`
	Points         int    `json:"points"`          // Add points here
	SequenceNumber int    `json:"sequence_number"` // Add sequence number
	Notes          string `json:"notes,omitempty"`
}
