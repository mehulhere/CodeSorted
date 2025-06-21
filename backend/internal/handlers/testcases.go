package handlers

import (
	"backend/internal/ai"
	"backend/internal/database"
	"backend/internal/models"
	"backend/internal/utils"

	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func AddTestCaseHandler(w http.ResponseWriter, r *http.Request) { // Only allowed for admins
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, "Method not allowed. Only POST is accepted.", http.StatusMethodNotAllowed)
		return
	}

	var payload models.AddTestCasePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		log.Println("Invalid add test case request payload:", err)
		utils.SendJSONError(w, "Invalid request payload for test case.", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate input (Points and SequenceNumber might have defaults if not provided, or be required)
	if payload.ProblemDBID == "" || payload.Input == "" {
		utils.SendJSONError(w, "ProblemDBID and Input are required for a test case.", http.StatusBadRequest)
		return
	}
	// You might want to add validation for payload.Points and payload.SequenceNumber (e.g., >= 0)

	problemObjectID, err := primitive.ObjectIDFromHex(payload.ProblemDBID)
	if err != nil {
		utils.SendJSONError(w, "Invalid ProblemDBID format. Must be a valid ObjectID hex string.", http.StatusBadRequest)
		return
	}

	problemsCollection := database.GetCollection("OJ", "problems")
	ctxCheck, cancelCheck := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelCheck()
	var existingProblem models.Problem
	err = problemsCollection.FindOne(ctxCheck, primitive.M{"_id": problemObjectID}).Decode(&existingProblem)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.SendJSONError(w, "Problem with the given ProblemDBID not found.", http.StatusNotFound)
			return
		}
		log.Println("Error checking for existing problem:", err)
		utils.SendJSONError(w, "Error verifying problem existence.", http.StatusInternalServerError)
		return
	}

	newTestCase := models.TestCase{
		ProblemDBID:    problemObjectID,
		Input:          payload.Input,
		ExpectedOutput: payload.ExpectedOutput,
		IsSample:       payload.IsSample,
		Points:         payload.Points,
		Notes:          payload.Notes,
		SequenceNumber: payload.SequenceNumber,
		CreatedAt:      time.Now(),
	}

	testCasesCollection := database.GetCollection("OJ", "testcases")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := testCasesCollection.InsertOne(ctx, newTestCase)
	if err != nil {
		log.Println("Failed to insert test case into DB:", err)
		utils.SendJSONError(w, "Failed to add test case.", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	response := map[string]interface{}{
		"message":      "Test case added successfully",
		"test_case_id": result.InsertedID,
	}
	json.NewEncoder(w).Encode(response)
	log.Printf("Test case added for problem %s with ID: %v. Points: %d, Sequence: %d\n", payload.ProblemDBID, result.InsertedID, payload.Points, payload.SequenceNumber)
}

// GenerateTestCasesRequest defines the expected payload for the test case generation endpoint
type GenerateTestCasesRequest struct {
	ProblemID        string                 `json:"problem_id"`
	ProblemStatement string                 `json:"problem_statement"`
	TestCases        map[string]interface{} `json:"test_cases"` // This can be optional now
	ProblemTitle     string                 `json:"problem_title"`
	ProblemDetails   *ai.ProblemDetails     `json:"problem_details"`
}

// GenerateTestCasesHandler handles the generation of test cases for a problem
func GenerateTestCasesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
		return
	}

	var req GenerateTestCasesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, fmt.Sprintf("Failed to decode request body: %v", err), http.StatusBadRequest)
		return
	}

	if req.ProblemStatement == "" || req.ProblemID == "" {
		http.Error(w, "Problem statement and problem ID are required", http.StatusBadRequest)
		return
	}

	// Generate expected outputs using AI and execution synchronously
	// This ensures the response is written only after the generation is complete.
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second) // Longer timeout for AI and execution
	defer cancel()

	generatedOutputs, err := ai.GenerateExpectedOutputs(ctx, req.ProblemStatement, req.ProblemDetails, req.TestCases, "python", req.ProblemID, req.ProblemTitle)
	if err != nil {
		log.Printf("Error generating expected outputs: %v", err)
		utils.SendJSONError(w, "Failed to generate expected outputs: "+err.Error(), http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"test_cases": generatedOutputs,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // Set status to 200 OK after successful generation
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Failed to encode response: %v", err)
		// If encoding fails, try to send a JSON error, but headers might already be sent
		utils.SendJSONError(w, "Failed to encode response", http.StatusInternalServerError)
	}
	log.Println("Successfully generated test cases")
}

// BulkAddTestCasesHandler handles adding multiple test cases at once
func BulkAddTestCasesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, "Method not allowed. Only POST is accepted.", http.StatusMethodNotAllowed)
		return
	}

	// Parse request body
	type BulkTestCaseInput struct {
		Input       string `json:"input"`
		IsPythonGen bool   `json:"python"`
	}

	type BulkAddTestCasesRequest struct {
		ProblemDBID string                       `json:"problem_db_id"`
		TestCases   map[string]BulkTestCaseInput `json:"test_cases"`
		SampleCount int                          `json:"sample_count"` // Number of test cases to mark as samples
	}

	var req BulkAddTestCasesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("Invalid bulk test cases request payload:", err)
		utils.SendJSONError(w, "Invalid request payload for bulk test cases.", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate input
	if req.ProblemDBID == "" || len(req.TestCases) == 0 {
		utils.SendJSONError(w, "ProblemDBID and at least one test case are required.", http.StatusBadRequest)
		return
	}

	// Verify problem exists
	problemObjectID, err := primitive.ObjectIDFromHex(req.ProblemDBID)
	if err != nil {
		utils.SendJSONError(w, "Invalid ProblemDBID format. Must be a valid ObjectID hex string.", http.StatusBadRequest)
		return
	}

	problemsCollection := database.GetCollection("OJ", "problems")
	ctxCheck, cancelCheck := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelCheck()

	var existingProblem models.Problem
	err = problemsCollection.FindOne(ctxCheck, primitive.M{"_id": problemObjectID}).Decode(&existingProblem)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.SendJSONError(w, "Problem with the given ProblemDBID not found.", http.StatusNotFound)
			return
		}
		log.Println("Error checking for existing problem:", err)
		utils.SendJSONError(w, "Error verifying problem existence.", http.StatusInternalServerError)
		return
	}

	// Create a context for Python expression evaluation
	evalCtx, cancelEval := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancelEval()

	// Evaluate Python expressions in test cases
	for testName, testInput := range req.TestCases {
		if testInput.IsPythonGen {
			// Use the AI service to evaluate Python expressions
			evaluatedInput, err := ai.EvaluatePythonExpression(evalCtx, testInput.Input)
			if err != nil {
				log.Printf("Failed to evaluate Python expression for test case %s: %v. Using original input.", testName, err)
				// Keep the original input if evaluation fails
				continue
			}
			req.TestCases[testName] = BulkTestCaseInput{
				Input:       evaluatedInput,
				IsPythonGen: false, // Mark as no longer needing Python evaluation
			}
			log.Printf("Evaluated Python expression for test case %s: %s -> %s", testName, ai.TruncateForLogging(testInput.Input, 100), ai.TruncateForLogging(evaluatedInput, 100))
		}
	}

	// Prepare test cases for insertion
	testCasesCollection := database.GetCollection("OJ", "testcases")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	var testCases []models.TestCase
	sequenceNumber := 1

	for testName, testInput := range req.TestCases {
		// Generate a simple empty expected output for now
		// In a real implementation, you would need to run the reference solution
		// against the input to get the expected output
		expectedOutput := ""

		// Determine if this test case should be a sample (for demonstration)
		isSample := sequenceNumber <= req.SampleCount

		// Create notes
		notes := testName

		testCases = append(testCases, models.TestCase{
			ProblemDBID:    problemObjectID,
			Input:          testInput.Input,
			ExpectedOutput: expectedOutput,
			IsSample:       isSample,
			Points:         1, // Default points value
			Notes:          notes,
			SequenceNumber: sequenceNumber,
			CreatedAt:      time.Now(),
		})

		sequenceNumber++
	}

	// Insert all test cases
	var insertedIDs []interface{}
	for _, testCase := range testCases {
		result, err := testCasesCollection.InsertOne(ctx, testCase)
		if err != nil {
			log.Println("Failed to insert test case into DB:", err)
			utils.SendJSONError(w, "Failed to add test cases.", http.StatusInternalServerError)
			return
		}
		insertedIDs = append(insertedIDs, result.InsertedID)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	response := map[string]interface{}{
		"message":         "Test cases added successfully",
		"test_case_count": len(testCases),
		"test_case_ids":   insertedIDs,
	}
	json.NewEncoder(w).Encode(response)
	log.Printf("Added %d test cases for problem %s\n", len(testCases), req.ProblemDBID)
}
