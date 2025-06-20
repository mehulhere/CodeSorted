package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"backend/internal/ai"
	"backend/internal/utils"
)

// GenerateBruteForceSolutionRequest defines the structure for the request body
type GenerateBruteForceSolutionRequest struct {
	ProblemStatement string `json:"problem_statement"`
	Language         string `json:"language"`
}

// GenerateExpectedOutputsRequest defines the structure for the request body
type GenerateExpectedOutputsRequest struct {
	ProblemStatement string                 `json:"problem_statement"`
	TestCases        map[string]interface{} `json:"test_cases"`
	Language         string                 `json:"language"`
}

// GenerateBruteForceSolutionHandler generates a brute force solution for a problem
func GenerateBruteForceSolutionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, "Method not allowed. Only POST is accepted.", http.StatusMethodNotAllowed)
		return
	}

	// Parse the request body
	var req GenerateBruteForceSolutionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("Invalid request payload:", err)
		utils.SendJSONError(w, "Invalid request payload.", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate the request
	if req.ProblemStatement == "" {
		utils.SendJSONError(w, "Problem statement is required.", http.StatusBadRequest)
		return
	}

	if req.Language == "" {
		req.Language = "python" // Default to Python if not specified
	}

	// Generate the solution using AI
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second) // Longer timeout for AI
	defer cancel()

	solution, err := ai.GenerateBruteForceSolution(ctx, req.ProblemStatement, req.Language)
	if err != nil {
		log.Printf("Failed to generate brute force solution: %v", err)
		utils.SendJSONError(w, "Failed to generate solution: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Return the generated solution
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	response := map[string]interface{}{
		"solution": solution,
		"language": req.Language,
	}
	json.NewEncoder(w).Encode(response)
	log.Println("Successfully generated brute force solution")
}

// GenerateExpectedOutputsHandler generates expected outputs for test cases
func GenerateExpectedOutputsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, "Method not allowed. Only POST is accepted.", http.StatusMethodNotAllowed)
		return
	}

	// Parse the request body
	var req GenerateExpectedOutputsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("Invalid request payload:", err)
		utils.SendJSONError(w, "Invalid request payload.", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate the request
	if req.ProblemStatement == "" {
		utils.SendJSONError(w, "Problem statement is required.", http.StatusBadRequest)
		return
	}

	if len(req.TestCases) == 0 {
		utils.SendJSONError(w, "Test cases are required.", http.StatusBadRequest)
		return
	}

	if req.Language == "" {
		req.Language = "python" // Default to Python if not specified
	}

	// Generate expected outputs using AI and execution
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second) // Longer timeout for AI and execution
	defer cancel()

	expectedOutputs, err := ai.GenerateExpectedOutputsWithExecution(ctx, req.ProblemStatement, req.TestCases, req.Language)
	if err != nil {
		log.Printf("Failed to generate expected outputs: %v", err)
		utils.SendJSONError(w, "Failed to generate expected outputs: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Return the generated expected outputs
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	response := map[string]interface{}{
		"expected_outputs": expectedOutputs,
	}
	json.NewEncoder(w).Encode(response)
	log.Println("Successfully generated expected outputs")
}
