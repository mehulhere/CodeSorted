package handlers

import (
	"encoding/json"
	"net/http"

	"backend/internal/ai"
	"backend/internal/utils"
)

type AutocompleteRequest struct {
	Prefix      string `json:"prefix"`      // All code before the cursor
	CurrentLine string `json:"currentLine"` // Just the current line
	Language    string `json:"language"`
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

	suggestion, err := ai.GetCodeCompletion(req.Prefix, req.CurrentLine, req.Language)
	if err != nil {
		utils.SendJSONError(w, "Failed to get code completion", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"suggestion": suggestion,
	})
}
