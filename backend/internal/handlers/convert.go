package handlers

import (
	"backend/internal/ai"
	"backend/internal/utils"
	"context"
	"encoding/json"
	"net/http"
	"time"
)

type ConvertRequest struct {
	Pseudocode string `json:"pseudocode"`
}

// ConvertCodeHandler handles requests to convert pseudocode to Python.
func ConvertCodeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ConvertRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendJSONError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Pseudocode == "" {
		utils.SendJSONError(w, "Pseudocode cannot be empty", http.StatusBadRequest)
		return
	}

	// Use a timeout for the AI conversion
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()

	pythonCode, err := ai.ConvertPseudocodeToPython(ctx, req.Pseudocode)
	if err != nil {
		utils.SendJSONError(w, "Failed to convert pseudocode: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"python_code": pythonCode,
	})
}
