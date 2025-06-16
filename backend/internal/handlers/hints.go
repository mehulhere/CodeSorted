package handlers

import (
	"backend/internal/ai"
	"backend/internal/utils"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"
)

type AIHintRequest struct {
	ProblemStatement string `json:"problem_statement"`
	Code             string `json:"code"`
	Language         string `json:"language"`
}

type AIHintResponse struct {
	Hints []string `json:"hints"`
}

// AIHintHandler handles requests for AI-generated hints for solving problems
// Always generates 3 progressive hints, but the frontend decides how many to display based on problem difficulty:
// - Easy problems: 1 hint
// - Medium problems: 2 hints
// - Hard problems: 3 hints
func AIHintHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, "Method not allowed. Only POST is accepted.", http.StatusMethodNotAllowed)
		return
	}

	// Parse the request body
	var req AIHintRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendJSONError(w, "Invalid request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Validate the request
	if req.ProblemStatement == "" {
		utils.SendJSONError(w, "Problem statement is required", http.StatusBadRequest)
		return
	}

	// Set a timeout for the AI request
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Generate progressive hints
	hints, err := ai.GenerateProgressiveHints(ctx, req.ProblemStatement, req.Code, req.Language)
	if err != nil {
		log.Printf("Error generating hints: %v", err)
		utils.SendJSONError(w, "Failed to generate hints: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Return the hints to the client
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AIHintResponse{
		Hints: hints,
	})
}
