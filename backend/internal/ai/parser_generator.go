package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type GeminiRequest struct {
	Contents []Content `json:"contents"`
}

type Content struct {
	Parts []Part `json:"parts"`
	Role  string `json:"role"`
}

type Part struct {
	Text string `json:"text"`
}

type GeminiResponse struct {
	Candidates []Candidate `json:"candidates"`
}

type Candidate struct {
	Content Content `json:"content"`
}

// GenerateParser creates a parser for the given language, input example, and output example
func GenerateParser(language, functionName, inputExample, outputExample string) (string, error) {
	// Construct prompt for Gemini
	prompt := fmt.Sprintf(
		`Create a %s function called 'parse_input' that takes a string input and returns arguments to be passed to a function called '%s'.
		
Input example: %s
Output example: %s

The parse_input function should correctly parse the input format shown and return arguments that, when passed to %s, will produce the expected output.
Return only the code for the parse_input function without any explanation.`,
		language, functionName, inputExample, outputExample, functionName,
	)

	// Create Gemini request
	geminiReq := GeminiRequest{
		Contents: []Content{
			{
				Parts: []Part{{Text: prompt}},
				Role:  "user",
			},
		},
	}

	// Get API key from environment
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY environment variable not set")
	}

	// Get Gemini model from environment or default
	geminiModel := os.Getenv("GEMINI_MODEL")
	if geminiModel == "" {
		geminiModel = "gemini-1.5-pro"
	}

	reqBody, err := json.Marshal(geminiReq)
	if err != nil {
		return "", err
	}

	// Send request to Gemini API
	apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", geminiModel, apiKey)
	resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("failed to get response from Gemini: %s, status: %d", string(body), resp.StatusCode)
	}

	// Parse response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var geminiResp GeminiResponse
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return "", err
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no response from Gemini")
	}

	// Extract the parse_input function
	return geminiResp.Candidates[0].Content.Parts[0].Text, nil
}
