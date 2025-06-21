package utils

import (
	"backend/internal/types"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// Helper function to send JSON errors
func SendJSONError(w http.ResponseWriter, message string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]string{"message": message})
}

// Helper function to send JSON responses
func SendJSONResponse(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}

// ParseJSON parses JSON from request body into the target struct
func ParseJSON(r *http.Request, target interface{}) error {
	return json.NewDecoder(r.Body).Decode(target)
}

// ParseInt parses a string to an integer with error handling
func ParseInt(s string) (int, error) {
	return strconv.Atoi(s)
}

// ExecuteCode delegates code execution to a long-lived language-specific
// executor container running on localhost.
//
// Language  →  Port
//
//	python      :8001
//	javascript  :8002
//	cpp         :8003
//	java        :8004
//
// The container exposes POST /execute with body types.ExecutionRequest
// and returns types.ExecutionResult.
func ExecuteCode(ctx context.Context, req types.ExecutionRequest) (types.ExecutionResult, error) {
	fmt.Println("Executing code in DOCKER in ", req.Language)
	log.Printf("ExecuteCode called with: FunctionName=%q, Language=%s, Parser length=%d",
		req.FunctionName, req.Language, len(req.Parser))

	langToPort := map[string]string{
		"python":     "8001",
		"javascript": "8002",
		"js":         "8002",
		"cpp":        "8003",
		"c++":        "8003",
		"java":       "8004",
	}

	port, ok := langToPort[strings.ToLower(req.Language)]
	if !ok {
		return types.ExecutionResult{}, fmt.Errorf("unsupported language: %s", req.Language)
	}

	endpoint := fmt.Sprintf("http://localhost:%s/execute", port)
	log.Printf("Sending request to: %s", endpoint)

	payload, err := json.Marshal(req)
	if err != nil {
		return types.ExecutionResult{}, fmt.Errorf("marshal exec-request: %w", err)
	}

	// Log a portion of the payload for debugging
	if len(payload) > 100 {
		log.Printf("Payload (first 100 bytes): %s...", string(payload[:100]))
	} else {
		log.Printf("Payload: %s", string(payload))
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return types.ExecutionResult{}, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return types.ExecutionResult{}, fmt.Errorf("executor call failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var e map[string]string
		_ = json.NewDecoder(resp.Body).Decode(&e)
		return types.ExecutionResult{}, fmt.Errorf("executor %d: %s", resp.StatusCode, e["message"])
	}

	var result types.ExecutionResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return types.ExecutionResult{}, fmt.Errorf("decode exec-result: %w", err)
	}

	log.Printf("Received execution result: status=%s", result.Status)
	return result, nil
}

// GetFileExtension returns the file extension for a given language.
func GetFileExtension(language string) string {
	switch strings.ToLower(language) {
	case "python":
		return ".py"
	case "javascript":
		return ".js"
	case "cpp":
		return ".cpp"
	case "java":
		return ".java"
	case "pseudocode":
		return ".pseudo"
	default:
		return ".txt"
	}
}

// func cleanAIResponse(resp string) (string, error) {
// 	// Clean the response by removing markdown backticks and "python" language identifier
// 	cleaned := strings.TrimSpace(resp)
// 	cleaned = strings.TrimPrefix(cleaned, "```python")
// 	cleaned = strings.TrimPrefix(cleaned, "```")
// 	cleaned = strings.TrimSuffix(cleaned, "```")
// 	return strings.TrimSpace(cleaned), nil
// }

// // cleanJSONString attempts to clean up a JSON string that might have formatting issues
// func cleanJSONString(jsonStr string) string {
// 	// Replace common issues that might cause parsing errors

// 	// Handle Python string multiplication (e.g., "a" * 50000)
// 	re := regexp.MustCompile(`"([^"]+)"\s*\*\s*(\d+)`)
// 	jsonStr = re.ReplaceAllString(jsonStr, `"$1"`)

// 	// Handle Python string concatenation (e.g., "a" * 25000 + "b" * 25000)
// 	re = regexp.MustCompile(`"([^"]+)"\s*\+\s*"([^"]+)"`)
// 	jsonStr = re.ReplaceAllString(jsonStr, `"$1$2"`)

// 	// Replace any sequence of * characters that might appear in comments
// 	jsonStr = regexp.MustCompile(`\*+`).ReplaceAllString(jsonStr, "")

// 	// Remove any trailing commas in objects and arrays which are invalid in JSON
// 	jsonStr = regexp.MustCompile(`,\s*\}`).ReplaceAllString(jsonStr, "}")
// 	jsonStr = regexp.MustCompile(`,\s*\]`).ReplaceAllString(jsonStr, "]")

// 	// Fix common quote issues with boolean values
// 	jsonStr = strings.ReplaceAll(jsonStr, `"python": True`, `"python": true`)
// 	jsonStr = strings.ReplaceAll(jsonStr, `"python": False`, `"python": false`)

// 	// Handle any other invalid characters that might appear in the JSON
// 	jsonStr = regexp.MustCompile(`[^\x20-\x7E]`).ReplaceAllString(jsonStr, "")

// 	return jsonStr
// }
