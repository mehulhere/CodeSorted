package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

// ComplexityResult holds the structured complexity analysis from the AI model.
type ComplexityResult struct {
	TimeComplexity   string `json:"time_complexity"`
	MemoryComplexity string `json:"memory_complexity"`
}

var client *genai.GenerativeModel

// InitAIClient initializes the Gemini client.
func InitAIClient(ctx context.Context) error {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("GEMINI_API_KEY environment variable not set")
	}

	genaiClient, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return fmt.Errorf("failed to create genai client: %w", err)
	}

	client = genaiClient.GenerativeModel("gemini-1.5-flash") // Use a fast and capable model
	return nil
}

// AnalyzeCodeComplexity uses the AI model to determine the time and memory complexity of a code snippet.
func AnalyzeCodeComplexity(ctx context.Context, code string, language string) (*ComplexityResult, error) {
	if client == nil {
		return nil, fmt.Errorf("AI client not initialized")
	}

	prompt := fmt.Sprintf(`
        You are an expert algorithm analyst.
        Analyze the following code snippet and provide its time and memory complexity in Big O notation.
        Provide the answer in JSON format with two keys: "time_complexity" and "memory_complexity".
        For example: {"time_complexity": "O(n)", "memory_complexity": "O(n)"}.
        Do not add any other text, explanations, or markdown formatting. Only return the raw JSON object.

        Language: %s
        Code:
        ---
        %s
        ---
    `, language, code)

	resp, err := client.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, fmt.Errorf("failed to generate content: %w", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no content in AI response")
	}

	// Extract the text content
	rawJSON, ok := resp.Candidates[0].Content.Parts[0].(genai.Text)
	if !ok {
		return nil, fmt.Errorf("AI response is not text")
	}

	// Clean the response: trim markdown and whitespace
	cleanedJSON := strings.TrimSpace(string(rawJSON))
	cleanedJSON = strings.TrimPrefix(cleanedJSON, "```json")
	cleanedJSON = strings.TrimPrefix(cleanedJSON, "```")
	cleanedJSON = strings.TrimSuffix(cleanedJSON, "```")
	cleanedJSON = strings.TrimSpace(cleanedJSON)

	// Unmarshal the JSON
	var result ComplexityResult
	if err := json.Unmarshal([]byte(cleanedJSON), &result); err != nil {
		log.Printf("Failed to unmarshal AI response: %s", cleanedJSON)
		return nil, fmt.Errorf("failed to parse AI response JSON: %w", err)
	}

	return &result, nil
}
