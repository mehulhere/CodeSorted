package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Problem defines the structure for a programming problem stored in MongoDB.
type Problem struct {
	ID              primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ProblemID       string             `json:"problem_id" bson:"problem_id"` // A custom, perhaps shorter/human-readable ID
	Title           string             `json:"title" bson:"title"`
	Difficulty      string             `json:"difficulty" bson:"difficulty"`             // e.g., "Easy", "Medium", "Hard"
	Statement       string             `json:"statement" bson:"statement"`               // Full problem description, examples, etc.
	ConstraintsText string             `json:"constraints_text" bson:"constraints_text"` // Text block for input constraints (e.g., "1 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9")
	TimeLimitMs     int                `json:"time_limit_ms" bson:"time_limit_ms"`       // Time limit in milliseconds
	MemoryLimitMB   int                `json:"memory_limit_mb" bson:"memory_limit_mb"`   // Memory limit in Megabytes
	Author          string             `json:"author,omitempty" bson:"author,omitempty"` // Optional: username or ID of the author
	Tags            []string           `json:"tags,omitempty" bson:"tags,omitempty"`     // Optional: e.g., ["Array", "Two Pointers", "Dynamic Programming"]
	CreatedAt       time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt       time.Time          `json:"updated_at" bson:"updated_at"`
	// Future considerations:
	// InputFormat string `json:"input_format" bson:"input_format"`
	// OutputFormat string `json:"output_format" bson:"output_format"`
	// SolutionStub map[string]string `json:"solution_stub" bson:"solution_stub"` // e.g., {"python": "def solve():\n  pass", "cpp": "..."}
	// Editorial string `json:"editorial,omitempty" bson:"editorial,omitempty"`
}

// ProblemListItem defines a simplified structure for listing problems.
type ProblemListItem struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ProblemID  string             `json:"problem_id" bson:"problem_id"`
	Title      string             `json:"title" bson:"title"`
	Difficulty string             `json:"difficulty" bson:"difficulty"`
	Tags       []string           `json:"tags,omitempty" bson:"tags,omitempty"` // Also show tags in list view
}
