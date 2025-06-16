package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"backend/internal/database"

	"github.com/google/generative-ai-go/genai"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"google.golang.org/api/option"
)

// ComplexityResult holds the structured complexity analysis from the AI model.
type ComplexityResult struct {
	TimeComplexity   string `json:"time_complexity"`
	MemoryComplexity string `json:"memory_complexity"`
}

// CompletionCacheEntry defines the schema for the cache in MongoDB.
type CompletionCacheEntry struct {
	ID         string    `bson:"_id"`
	Suggestion string    `bson:"suggestion"`
	CreatedAt  time.Time `bson:"createdAt"`
}

// Define a struct for the expected JSON response from the AI.
type AICompletionResponse struct {
	Suggestion string `json:"suggestion"`
}

var client *genai.GenerativeModel
var completionCacheCollection *mongo.Collection

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

	// client = genaiClient.GenerativeModel("gemma-3n-e4b") // Use Gemma 3n E4B model
	client = genaiClient.GenerativeModel("gemini-2.0-flash-lite")

	// Initialize the database collection for caching
	completionCacheCollection = database.GetCollection("OJ", "completion_cache")

	// Ensure TTL index on the cache collection
	if err := ensureCacheTTLIndex(ctx); err != nil {
		return fmt.Errorf("failed to ensure cache TTL index: %w", err)
	}

	return nil
}

// ensureCacheTTLIndex creates a TTL index on the `createdAt` field.
func ensureCacheTTLIndex(ctx context.Context) error {
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "createdAt", Value: 1}},
		Options: options.Index().SetExpireAfterSeconds(3600), // Expire after 1 hour
	}
	_, err := completionCacheCollection.Indexes().CreateOne(ctx, indexModel)
	if err != nil {
		// Ignore if the index already exists, but log other errors.
		if !strings.Contains(err.Error(), "index already exists") {
			return fmt.Errorf("failed to create TTL index: %w", err)
		}
		log.Println("TTL index on completion_cache already exists.")
	}
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

func cleanAIResponse(resp string) (string, error) {
	// Clean the response by removing markdown backticks and "python" language identifier
	cleaned := strings.TrimSpace(resp)
	cleaned = strings.TrimPrefix(cleaned, "```python")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	return strings.TrimSpace(cleaned), nil
}

// ConvertPseudocodeToPython uses the AI model to convert pseudocode into runnable Python code.
func ConvertPseudocodeToPython(ctx context.Context, pseudocode string) (string, error) {
	if client == nil {
		return "", fmt.Errorf("AI client not initialized")
	}

	prompt := "You are an expert programmer specializing in converting pseudocode to clean, runnable Python code. " +
		"Your task is to translate the given pseudocode into a single, complete Python script.\n\n" +
		"**Instructions:**\n" +
		"1. **Direct Translation:** Convert the user's logic as directly as possible. Do not add new features, algorithms, or logic that are not explicitly mentioned in the pseudocode.\n" +
		"2. **Helper Function Generation:** If the user includes a comment like \"# define binary search\" or \"# implement DFS\", you MUST generate the standard, efficient Python implementation for that specific algorithm as a helper function. The function signature should be inferred from the context if possible. Only generate code for these explicitly requested, well-known algorithms.\n" +
		"3. **No Main Solution:** Do NOT generate the main solution logic (e.g., the main `twoSum` function in a Two Sum problem). Only generate the helper functions as described above. The user is responsible for writing the main logic.\n" +
		"4. **Clean Output:** Return ONLY the raw Python code. Do not include any explanations, comments (unless they were in the original pseudocode), or markdown formatting like ```python.\n\n" +
		"**Pseudocode to Convert:**\n" +
		"---\n" +
		pseudocode +
		"\n---"

	resp, err := client.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return "", fmt.Errorf("failed to generate content for pseudocode conversion: %w", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no content in AI response for pseudocode conversion")
	}

	pythonCode, ok := resp.Candidates[0].Content.Parts[0].(genai.Text)
	if !ok {
		return "", fmt.Errorf("AI response is not text")
	}

	// Clean the response: trim markdown and whitespace
	cleanedCode, err := cleanAIResponse(string(pythonCode))
	if err != nil {
		return "", err
	}

	return cleanedCode, nil
}

func GetCodeCompletion(prefix, currentLine, language string) (string, error) {
	ctx := context.Background()

	// Create a unique cache key from the inputs.
	cacheKey := fmt.Sprintf("lang:%s|prefix:%s|current:%s", language, prefix, currentLine)

	// 1. Check database cache first
	var cachedEntry CompletionCacheEntry
	err := completionCacheCollection.FindOne(ctx, bson.M{"_id": cacheKey}).Decode(&cachedEntry)
	if err == nil {
		// Found in cache
		log.Printf("Cache hit for key: %s", cacheKey)
		return cachedEntry.Suggestion, nil
	}
	if err != mongo.ErrNoDocuments {
		log.Printf("Error checking cache: %v", err)
		// Proceed without cache, but log the error.
	}

	// Create a prompt that handles both single-line and multi-line generation.
	prompt := fmt.Sprintf(
		"You are an intelligent code completion assistant. Your task is to complete the code provided by the user.\n"+
			"You will be given the code that appears before the cursor, and the content of the current line up to the cursor.\n"+
			"Based on this context, provide the most logical and likely code completion.\n\n"+
			"**Instructions:**\n"+
			"1. The completion can be a single line or multiple lines of code.\n"+
			"2. Respond with a JSON object containing a single key: \"suggestion\". The value should be the code to be inserted at the cursor position.\n"+
			"3. If the new code should start from a new line, ADD a newline character at the beginning of the suggestion string.\n"+
			"4. Do NOT repeat any code that was already provided in the 'Code before cursor' or 'Current line' sections in your suggestion.\n"+
			"5. Do NOT include any conversational text, explanations, or markdown formatting (like ```json). Return only the raw JSON object.\n\n"+
			"---CONTEXT---\n"+
			"Language: %s\n\n"+
			"Code before cursor:\n```\n%s\n```\n\n"+
			"Current line:\n```\n%s\n```\n\n"+
			"Provide the completion in the following JSON format:\n"+
			"{\"suggestion\": \"<your code completion here>\"}",
		language, prefix, currentLine)

	log.Printf("Sending prompt to AI for completion:\n%s", prompt)

	resp, err := client.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return "", fmt.Errorf("gemini API call failed: %w", err)
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil || len(resp.Candidates[0].Content.Parts) == 0 {
		fmt.Println("No suggestion received from AI")
		return "", nil // No suggestion
	}

	part := resp.Candidates[0].Content.Parts[0]
	if textPart, ok := part.(genai.Text); ok {
		rawJSON := string(textPart)
		log.Printf("Raw AI response: %s", rawJSON)

		// Clean the response: trim markdown and whitespace
		cleanedJSON := strings.TrimSpace(rawJSON)
		cleanedJSON = strings.TrimPrefix(cleanedJSON, "```json")
		cleanedJSON = strings.TrimPrefix(cleanedJSON, "```")
		cleanedJSON = strings.TrimSuffix(cleanedJSON, "```")
		cleanedJSON = strings.TrimSpace(cleanedJSON)

		var result AICompletionResponse
		if err := json.Unmarshal([]byte(cleanedJSON), &result); err != nil {
			log.Printf("Failed to unmarshal AI completion response: %s", cleanedJSON)
			// Fallback: maybe the model returned raw code despite instructions
			if strings.Contains(err.Error(), "invalid character") {
				return cleanedJSON, nil // return the cleaned text as a fallback
			}
			return "", fmt.Errorf("failed to parse AI response JSON: %w", err)
		}

		suggestion := result.Suggestion
		log.Printf("Cleaned AI response: %s", suggestion)

		// Set to cache on successful response
		if suggestion != "" {
			newEntry := CompletionCacheEntry{
				ID:         cacheKey,
				Suggestion: suggestion,
				CreatedAt:  time.Now(),
			}
			_, err := completionCacheCollection.InsertOne(ctx, newEntry)
			if err != nil {
				log.Printf("Failed to cache completion suggestion: %v", err)
			} else {
				log.Printf("Cached suggestion for key: %s", cacheKey)
			}
		}

		return suggestion, nil
	}

	return "", nil
}

// GenerateHintContent uses the AI model to generate a hint based on the provided prompt
func GenerateHintContent(ctx context.Context, prompt string) (*genai.GenerateContentResponse, error) {
	if client == nil {
		return nil, fmt.Errorf("AI client not initialized")
	}

	resp, err := client.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, fmt.Errorf("failed to generate content for hint: %w", err)
	}

	return resp, nil
}

// GenerateProgressiveHints generates a set of 3 progressive hints for a problem
// Each hint provides more guidance than the previous one
func GenerateProgressiveHints(ctx context.Context, problemStatement, code, language string) ([]string, error) {
	if client == nil {
		return nil, fmt.Errorf("AI client not initialized")
	}

	// Create a prompt for the AI to generate progressive hints
	prompt := fmt.Sprintf(`
You are an expert programming tutor who specializes in giving helpful hints without revealing full solutions.
Based on the problem statement and the user's current code, provide THREE progressive hints that will guide them 
toward the solution without giving away the complete answer.

Problem Statement:
"""
%s
"""

User's Current Code (%s):
"""
%s
"""

Please provide 3 progressive hints, each building on the previous one:

1. Hint 1: A subtle clue about the approach or a gentle nudge toward the key insight needed.
   This should be vague but useful, focusing on conceptual understanding.

2. Hint 2: A more specific suggestion that builds on the first hint, possibly pointing out
   a particular algorithm or data structure that might be helpful.

3. Hint 3: A more detailed hint that gives clearer direction without providing the full solution.
   This may include a specific approach or technique but still leaves implementation details for the user.

Format your response as a JSON array with exactly 3 strings (no additional text):
["Hint 1 text", "Hint 2 text", "Hint 3 text"]
`, problemStatement, language, code)

	resp, err := client.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		if err.Error() == "AI client not initialized" {
			return []string{
				"AI service is not available at the moment. Please try again later.",
				"AI service is not available at the moment. Please try again later.",
				"AI service is not available at the moment. Please try again later.",
			}, nil
		}
		return nil, err
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return []string{
			"Sorry, I couldn't generate hints at this time. Please try again later.",
			"Sorry, I couldn't generate hints at this time. Please try again later.",
			"Sorry, I couldn't generate hints at this time. Please try again later.",
		}, nil
	}

	// Extract the hint from the response
	hintsText, ok := resp.Candidates[0].Content.Parts[0].(genai.Text)
	if !ok {
		return []string{
			"Sorry, I couldn't generate hints at this time. Please try again later.",
			"Sorry, I couldn't generate hints at this time. Please try again later.",
			"Sorry, I couldn't generate hints at this time. Please try again later.",
		}, nil
	}

	// Clean the response: trim markdown and whitespace
	cleanedJSON := strings.TrimSpace(string(hintsText))
	cleanedJSON = strings.TrimPrefix(cleanedJSON, "```json")
	cleanedJSON = strings.TrimPrefix(cleanedJSON, "```")
	cleanedJSON = strings.TrimSuffix(cleanedJSON, "```")
	cleanedJSON = strings.TrimSpace(cleanedJSON)

	// Parse the JSON array
	var hints []string
	if err := json.Unmarshal([]byte(cleanedJSON), &hints); err != nil {
		log.Printf("Failed to unmarshal AI hints response: %s", cleanedJSON)

		// Fallback: if not valid JSON, try to extract hints by line splitting
		lines := strings.Split(string(hintsText), "\n")
		hints = []string{}

		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line != "" && !strings.HasPrefix(line, "[") && !strings.HasPrefix(line, "]") {
				hints = append(hints, line)
			}
			if len(hints) >= 3 {
				break
			}
		}

		// If we still don't have 3 hints, fill with defaults
		for len(hints) < 3 {
			hints = append(hints, "Sorry, I couldn't generate a proper hint. Try a different approach.")
		}

		return hints[:3], nil
	}

	// Make sure we have exactly 3 hints
	if len(hints) < 3 {
		for len(hints) < 3 {
			hints = append(hints, "Sorry, I couldn't generate a complete set of hints. Try a different approach.")
		}
	}

	return hints[:3], nil
}
