package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"backend/internal/types"
)

// ExecuteCode runs code in a Docker container or AWS Lambda and returns the result
func ExecuteCode(language string, code string, input string) (*types.ExecutionResult, error) {
	// Create an execution request
	execReq := types.ExecutionRequest{
		Language:    language,
		Code:        code,
		Input:       input,
		TimeLimitMs: 10000, // 10 seconds
	}

	// For Python, use AWS Lambda instead of local executor
	if language == "python" {
		return ExecuteCodeWithLambda(execReq)
	}

	// For other languages, use the local executor as before
	// Convert the request to JSON
	reqBody, err := json.Marshal(execReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal execution request: %w", err)
	}

	// Create a context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Determine the executor URL based on language
	var executorURL string
	switch language {
	case "javascript":
		executorURL = "http://localhost:8002/execute"
	case "cpp":
		executorURL = "http://localhost:8003/execute"
	case "java":
		executorURL = "http://localhost:8004/execute"
	default:
		return nil, fmt.Errorf("unsupported language: %s", language)
	}

	// Create an HTTP request
	req, err := http.NewRequestWithContext(ctx, "POST", executorURL, strings.NewReader(string(reqBody)))
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// Send the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute code: %w", err)
	}
	defer resp.Body.Close()

	// Check if the request was successful
	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("executor service returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	// Parse the response
	var result types.ExecutionResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode execution result: %w", err)
	}

	return &result, nil
}

// ExecuteBruteForceSolution executes a brute force solution against a set of test cases
func ExecuteBruteForceSolution(ctx context.Context, solution string, language string, functionName string, testCases map[string]interface{}) (map[string]string, error) {
	// Prepare a map to store the expected outputs
	expectedOutputs := make(map[string]string)

	// If no function name is provided, use a default based on language
	if functionName == "" {
		switch language {
		case "python", "javascript", "cpp":
			functionName = "solution"
		case "java":
			functionName = "Solution"
		default:
			return nil, fmt.Errorf("unsupported language for default function name: %s", language)
		}
	}

	// Execute the solution against each test case
	for testName, testData := range testCases {
		testCase, ok := testData.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("invalid test case format for %s", testName)
		}

		input, ok := testCase["input"].(string)
		if !ok {
			return nil, fmt.Errorf("invalid input format for test case %s", testName)
		}

		// Execute the solution against the test case
		result, err := ExecuteCode(language, solution, input)
		if err != nil {
			log.Printf("Failed to execute solution for test case %s: %v", testName, err)
			expectedOutputs[testName] = fmt.Sprintf("<execution-error: %v>", err)
			continue
		}

		// Check if the execution was successful
		if result.Status != "success" {
			log.Printf("Execution failed for test case %s: %s", testName, result.Status)
			expectedOutputs[testName] = fmt.Sprintf("<execution-failed: %s>", result.Status)
			continue
		}

		// Store the output
		expectedOutputs[testName] = result.Output
	}

	return expectedOutputs, nil
}

// EvaluatePythonInExecutor evaluates a Python expression using the executor service
func EvaluatePythonInExecutor(ctx context.Context, expression string) (string, error) {
	// We generate a script that directly prints the expression's result.
	// This avoids wrapping it in a function that the executor doesn't know to call.
	code := fmt.Sprintf(`
import sys
sys.set_int_max_str_digits(0)
print(%s)
`, expression)

	// The function takes no input, so the input parameter is empty.
	result, err := ExecuteCode("python", code, "")
	if err != nil {
		return "", fmt.Errorf("python expression execution failed: %w", err)
	}

	if result.Status != "success" {
		// If there's a compilation or runtime error, it will be in the Output field.
		return "", fmt.Errorf("python expression evaluation failed with status %s: %s", result.Status, result.Output)
	}

	// The output of the expression will be in the Output field.
	return strings.TrimSpace(result.Output), nil
}
