package handlers

import (
	"encoding/json"
	"net/http"

	"backend/internal/ai"
	"backend/internal/utils"
)

// AutocompleteRequest struct mirrors the frontend request body for code completion.
type AutocompleteRequest struct {
	Prefix         string             `json:"prefix"`      // All code before the cursor
	CurrentLine    string             `json:"currentLine"` // Just the current line
	Language       string             `json:"language"`
	ProblemName    string             `json:"problemName"`    // Optional problem name for context
	SampleTestCase *ai.SampleTestCase `json:"sampleTestCase"` // Optional sample test case for context
}

func AutocompleteHandler(w http.ResponseWriter, r *http.Request) {
	var req AutocompleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Prefix == "" || req.Language == "" {
		utils.SendJSONError(w, "Prefix and language are required", http.StatusBadRequest)
		return
	}

	suggestion, err := ai.GetCodeCompletion(req.Prefix, req.CurrentLine, req.Language, req.ProblemName, req.SampleTestCase)
	if err != nil {
		utils.SendJSONError(w, "Failed to get code completion", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"suggestion": suggestion,
	})
}
