package models

import "go.mongodb.org/mongo-driver/bson/primitive"

// TestResultStatus represents the status of a single test case execution.
type TestResultStatus string

const (
	TestResultStatusPassed              TestResultStatus = "PASSED"
	TestResultStatusWrongAnswer         TestResultStatus = "WRONG_ANSWER"
	TestResultStatusTimeLimitExceeded   TestResultStatus = "TIME_LIMIT_EXCEEDED"
	TestResultStatusMemoryLimitExceeded TestResultStatus = "MEMORY_LIMIT_EXCEEDED"
	TestResultStatusRuntimeError        TestResultStatus = "RUNTIME_ERROR"
)

// SubmissionResult stores the outcome of a single test case for a submission.
type SubmissionResult struct {
	ID              primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	SubmissionID    primitive.ObjectID `json:"submission_id" bson:"submission_id"`
	TestCaseID      primitive.ObjectID `json:"test_case_id" bson:"test_case_id"`
	SequenceNumber  int                `json:"sequence_number" bson:"sequence_number"`
	Status          TestResultStatus   `json:"status" bson:"status"`
	Input           string             `json:"input" bson:"input"`
	ExpectedOutput  string             `json:"expected_output" bson:"expected_output"`
	ActualOutput    string             `json:"actual_output" bson:"actual_output"`
	ExecutionTimeMs int                `json:"execution_time_ms" bson:"execution_time_ms"`
	MemoryUsedKB    int                `json:"memory_used_kb" bson:"memory_used_kb"`
	Error           string             `json:"error,omitempty" bson:"error,omitempty"`
}
