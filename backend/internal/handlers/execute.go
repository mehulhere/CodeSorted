package handlers

import (
	"backend/internal/database"
	"backend/internal/types"
	"backend/internal/utils"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

func ExecuteCodeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var payload types.ExecuteCodePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.SendJSONError(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if payload.Code == "" || payload.Language == "" || payload.ProblemId == "" {
		utils.SendJSONError(w, "Fields 'code', 'language', and 'problemId' are required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	// Fetch the parser and solution code from the database
	artifacts, err := database.GetGeneratedCode(ctx, payload.ProblemId, payload.Language)
	if err != nil {
		log.Printf("Failed to get generated code for problem '%s': %v", payload.ProblemId, err)
		utils.SendJSONError(w, "Could not find solution artifacts for this problem. Please try again.", http.StatusNotFound)
		return
	}

	// The user provides the core function logic. We need to reconstruct the full script.
	// We assume the user's code is the body of the function signature stored in the artifacts.
	// NOTE: The stored SolutionCode in the artifact is a complete, working solution,
	// but for this endpoint, we use the user's provided code.
	fullCode := fmt.Sprintf(
		`
# ====== PARSER CODE ======
%s

# ====== USER-PROVIDED SOLUTION ======
%s

# ====== OUTPUT CODE ======
%s
`,
		artifacts.InputParserCode,
		payload.Code, // The user's function code
		artifacts.OutputParserCode,
	)

	// Determine test cases
	testCases := payload.TestCases
	if len(testCases) == 0 {
		testCases = []string{payload.Stdin} // Fallback to stdin for single test cases
	}

	// Prepare the response structure
	result := types.ExecuteCodeResult{
		Status:  "processing",
		Results: make([]types.TestCaseResult, len(testCases)),
	}

	var maxExecutionTime int64
	hasError := false

	for i, testInput := range testCases {
		execReq := types.ExecutionRequest{
			Language:    payload.Language,
			Code:        fullCode,
			Input:       testInput,
			TimeLimitMs: 5000, // 5-second time limit per test case
		}

		execCtx, execCancel := context.WithTimeout(ctx, 7*time.Second) // Executor timeout
		execResult, err := utils.ExecuteCode(execCtx, execReq)
		execCancel()

		result.Results[i] = types.TestCaseResult{
			ExecutionTimeMs: int64(execResult.ExecutionTimeMs),
			Status:          execResult.Status,
		}

		if err != nil {
			result.Results[i].Error = err.Error()
			result.Results[i].Status = "error"
		}

		if execResult.Status == "success" {
			result.Results[i].Stdout = execResult.Output
		} else {
			result.Results[i].Stderr = execResult.Output
			hasError = true
		}

		if result.Results[i].ExecutionTimeMs > maxExecutionTime {
			maxExecutionTime = result.Results[i].ExecutionTimeMs
		}
	}

	// Set overall status
	if hasError {
		result.Status = "error"
	} else {
		result.Status = "success"
	}
	result.ExecutionTimeMs = maxExecutionTime

	// For backward compatibility, populate top-level fields from the first test case
	if len(result.Results) > 0 {
		result.Stdout = result.Results[0].Stdout
		result.Stderr = result.Results[0].Stderr
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
