package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SubmissionStatus represents the result of a submission
type SubmissionStatus string

const (
	StatusPending             SubmissionStatus = "PENDING"
	StatusAccepted            SubmissionStatus = "ACCEPTED"
	StatusWrongAnswer         SubmissionStatus = "WRONG_ANSWER"
	StatusTimeLimitExceeded   SubmissionStatus = "TIME_LIMIT_EXCEEDED"
	StatusMemoryLimitExceeded SubmissionStatus = "MEMORY_LIMIT_EXCEEDED"
	StatusRuntimeError        SubmissionStatus = "RUNTIME_ERROR"
	StatusCompilationError    SubmissionStatus = "COMPILATION_ERROR"
)

// Submission defines the structure for a user's code submission
type Submission struct {
	ID               primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID           primitive.ObjectID `json:"user_id" bson:"user_id"`
	ProblemID        string             `json:"problem_id" bson:"problem_id"`
	Language         string             `json:"language" bson:"language"` // e.g., "python", "javascript", "cpp"
	Status           SubmissionStatus   `json:"status" bson:"status"`
	ExecutionTimeMs  int                `json:"execution_time_ms" bson:"execution_time_ms"`
	MemoryUsedKB     int                `json:"memory_used_kb" bson:"memory_used_kb"`
	SubmittedAt      time.Time          `json:"submitted_at" bson:"submitted_at"`
	TestCasesPassed  int                `json:"test_cases_passed" bson:"test_cases_passed"`
	TestCasesTotal   int                `json:"test_cases_total" bson:"test_cases_total"`
	TimeComplexity   string             `json:"time_complexity,omitempty" bson:"time_complexity,omitempty"`
	MemoryComplexity string             `json:"memory_complexity,omitempty" bson:"memory_complexity,omitempty"`
	UseParser        bool               `json:"use_parser" bson:"use_parser"` // Whether to use the generic input parser
}

// Parse submission data
type SubmissionData struct {
	ProblemID string `json:"problem_id"`
	Language  string `json:"language"`
	Code      string `json:"code"`
	UseParser bool   `json:"use_parser"` // Whether to use the generic input parser
}

// SubmissionListItem defines a simplified structure for listing submissions
type SubmissionListItem struct {
	ID              primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID          primitive.ObjectID `json:"user_id" bson:"user_id"`
	Username        string             `json:"username" bson:"username"`
	ProblemID       string             `json:"problem_id" bson:"problem_id"`
	ProblemTitle    string             `json:"problem_title" bson:"problem_title"`
	Language        string             `json:"language" bson:"language"`
	Status          SubmissionStatus   `json:"status" bson:"status"`
	ExecutionTimeMs int                `json:"execution_time_ms" bson:"execution_time_ms"`
	SubmittedAt     time.Time          `json:"submitted_at" bson:"submitted_at"`
}
