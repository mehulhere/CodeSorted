package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"backend/internal/types"
)

// ExecuteCode runs code in a Docker container and returns the result
func ExecuteCode(language string, code string, input string, functionName string) (*types.ExecutionResult, error) {
	// Create an execution request
	execReq := types.ExecutionRequest{
		Language:     language,
		Code:         code,
		Input:        input,
		TimeLimitMs:  10000, // 10 seconds
		FunctionName: functionName,
	}

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
	case "python":
		executorURL = "http://python_executor:8080/execute"
	case "javascript":
		executorURL = "http://js_executor:8080/execute"
	case "cpp":
		executorURL = "http://cpp_executor:8080/execute"
	case "java":
		executorURL = "http://java_executor:8080/execute"
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

	// Parse the response
	var result types.ExecutionResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode execution result: %w", err)
	}

	return &result, nil
}

// ExecuteBruteForceSolution executes a brute force solution against a set of test cases
func ExecuteBruteForceSolution(ctx context.Context, solution string, language string, testCases map[string]interface{}) (map[string]string, error) {
	// Prepare a map to store the expected outputs
	expectedOutputs := make(map[string]string)

	// Determine the function name based on the language
	var functionName string
	switch language {
	case "python":
		functionName = "solution"
	case "javascript":
		functionName = "solution"
	case "cpp":
		functionName = "solution"
	case "java":
		functionName = "Solution"
	default:
		return nil, fmt.Errorf("unsupported language: %s", language)
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

		// Check if this is a Python-generated input
		isPython, _ := testCase["python"].(bool)
		if isPython {
			// For Python-generated inputs, we need to evaluate them
			// This would be handled by a separate function
			expectedOutputs[testName] = "<requires-python-evaluation>"
			continue
		}

		// Execute the solution against the test case
		result, err := ExecuteCode(language, solution, input, functionName)
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

// GenerateExpectedOutputsWithExecution uses a reference solution to generate expected outputs for test cases
func GenerateExpectedOutputsWithExecution(ctx context.Context, problemStatement string, testCases map[string]interface{}, language string) (map[string]string, error) {
	// First, generate a brute force reference solution
	referenceSolution, err := GenerateBruteForceSolution(ctx, problemStatement, language)
	if err != nil {
		return nil, fmt.Errorf("failed to generate reference solution: %w", err)
	}

	// Log the reference solution for debugging
	log.Printf("Generated reference solution (%d characters): %s", len(referenceSolution), truncateForLogging(referenceSolution, 200))

	// Execute the reference solution against the test cases
	expectedOutputs, err := ExecuteBruteForceSolution(ctx, referenceSolution, language, testCases)
	if err != nil {
		return nil, fmt.Errorf("failed to execute reference solution: %w", err)
	}

	return expectedOutputs, nil
}
