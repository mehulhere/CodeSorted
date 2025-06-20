package handlers

import (
	"backend/internal/ai"
	"backend/internal/types"
	"backend/internal/utils"
	"encoding/json"
	"log"
	"net/http"
	"strings"
)

func ParserCheckHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, "Method not allowed. Only POST is accepted.", http.StatusMethodNotAllowed)
		return
	}

	var payload types.ParserCheckPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.SendJSONError(w, "Invalid request payload for parser check.", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate required fields
	if payload.Language == "" || payload.InputExample == "" || payload.OutputExample == "" {
		utils.SendJSONError(w, "Language, input example, and output example are required.", http.StatusBadRequest)
		return
	}

	// Map language name for consistency
	langName := payload.Language
	if strings.ToLower(langName) == "js" {
		langName = "javascript"
	} else if strings.ToLower(langName) == "cpp" {
		langName = "c++"
	}

	// Function name default if not provided
	functionName := payload.FunctionName
	if functionName == "" {
		functionName = "solution"
	}

	// Generate parser if not provided
	parserCode := payload.ParserCode
	var err error
	if parserCode == "" {
		log.Printf("Generating parser with: language=%s, functionName=%s, inputExample=%s, outputExample=%s",
			langName, functionName, payload.InputExample, payload.OutputExample)

		parserCode, err = ai.GenerateParser(langName, functionName, payload.InputExample, payload.OutputExample)
		if err != nil {
			log.Printf("Failed to generate parser: %v", err)
			utils.SendJSONError(w, "Failed to generate parser: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// Return the parser code
	response := map[string]string{
		"parser_code": parserCode,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
