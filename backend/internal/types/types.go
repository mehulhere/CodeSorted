package types

import "github.com/golang-jwt/jwt/v5"

// This is the struct for the JWT token
type Claims struct {
	UserID    string `json:"user_id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	Firstname string `json:"firstname"`
	Lastname  string `json:"lastname"`
	IsAdmin   bool   `json:"is_admin"`
	jwt.RegisteredClaims
}

// This is the struct for the registration payload
type RegisterationPayload struct {
	Firstname string `json:"firstname"`
	Lastname  string `json:"lastname"`
	Email     string `json:"email"`
	Username  string `json:"username"`
	Password  string `json:"password"`
}

// This is the struct for the login payload
type LoginPayload struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// This is the struct for the code execution payload
type ExecuteCodePayload struct {
	Language      string   `json:"language"`
	Code          string   `json:"code"`
	Stdin         string   `json:"stdin"`     // Single test case input (for backward compatibility)
	TestCases     []string `json:"testCases"` // Multiple test cases input
	ProblemId     string   `json:"problemId"` // Problem ID for extracting function name
	InputExample  string   `json:"input_example"`
	OutputExample string   `json:"output_example"`
}

// This is the struct for the code execution result
type ExecuteCodeResult struct {
	Stdout          string           `json:"stdout"`
	Stderr          string           `json:"stderr"`
	ExecutionTimeMs int64            `json:"execution_time_ms"`
	MemoryUsageKb   int64            `json:"memory_usage_kb"`   // Placeholder, actual measurement is complex
	Error           string           `json:"error,omitempty"`   // For errors in the execution service itself
	Status          string           `json:"status"`            // e.g., "success", "compile_error", "runtime_error", "timeout"
	Results         []TestCaseResult `json:"results,omitempty"` // Results for multiple test cases
}

// TestCaseResult defines the result for a single test case
type TestCaseResult struct {
	Stdout          string `json:"stdout"`
	Stderr          string `json:"stderr"`
	ExecutionTimeMs int64  `json:"execution_time_ms"`
	Error           string `json:"error,omitempty"`
	Status          string `json:"status"`
}

// ExecutionRequest defines the structure for a code execution request
type ExecutionRequest struct {
	Language     string `json:"language"`
	Code         string `json:"code"`
	Input        string `json:"input"`
	TimeLimitMs  int    `json:"time_limit_ms"`
	FunctionName string `json:"function_name"`
	Parser       string `json:"parser"`
}

// ExecutionResult defines the structure for a code execution result
type ExecutionResult struct {
	Output          string `json:"output"`
	ExecutionTimeMs int    `json:"execution_time_ms"`
	MemoryUsedKB    int    `json:"memory_used_kb"`
	Status          string `json:"status"`
}

// ParserCheckPayload defines the structure for a parser check request
type ParserCheckPayload struct {
	Language      string `json:"language"`
	FunctionName  string `json:"function_name"`
	InputExample  string `json:"input_example"`
	OutputExample string `json:"output_example"`
	ParserCode    string `json:"parser_code"`
}
