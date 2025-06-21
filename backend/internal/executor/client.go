package executor

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
)

// ExecRequest matches the structure expected by the python_executor service.
type ExecRequest struct {
	Code         string `json:"code"`
	Input        string `json:"input"`
	TimeLimitMs  int    `json:"time_limit_ms"`
	Language     string `json:"language"`
	FunctionName string `json:"function_name"`
	Parser       string `json:"parser,omitempty"`
}

// ExecResult matches the structure returned by the python_executor service.
type ExecResult struct {
	Output          string `json:"output"`
	ExecutionTimeMs int    `json:"execution_time_ms"`
	MemoryUsedKB    int    `json:"memory_used_kb"`
	Status          string `json:"status"`
}

var executorURL = "http://localhost:8080/execute"

func init() {
	// Allow overriding executor URL via environment variable, useful for different environments (e.g., Docker)
	if url := os.Getenv("PYTHON_EXECUTOR_URL"); url != "" {
		executorURL = url
	}
}

// ExecuteCode sends a request to the Python executor service to run code against a given input.
func ExecuteCode(ctx context.Context, language, code, functionName, input string) (*ExecResult, error) {
	if language != "python" {
		return nil, fmt.Errorf("executor client currently only supports python")
	}

	reqPayload := ExecRequest{
		Code:         code,
		Input:        input,
		TimeLimitMs:  5000, // 5 second timeout for execution
		Language:     language,
		FunctionName: functionName,
		Parser:       "", // Let the executor use its default for now
	}

	payloadBytes, err := json.Marshal(reqPayload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal executor request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", executorURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create executor request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// The overall context timeout will handle the request timeout.
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		// Check if the error is due to connection refusal
		if strings.Contains(err.Error(), "connection refused") {
			return nil, fmt.Errorf("failed to connect to the python executor service at %s. Is it running?", executorURL)
		}
		return nil, fmt.Errorf("failed to call executor service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errBody map[string]string
		json.NewDecoder(resp.Body).Decode(&errBody)
		return nil, fmt.Errorf("executor service returned status %d: %s", resp.StatusCode, errBody["error"])
	}

	var result ExecResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode executor response: %w", err)
	}

	return &result, nil
}
