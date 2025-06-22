package handlers

import (
	"backend/internal/ai"
	"backend/internal/database"
	"backend/internal/models"
	"backend/internal/types"
	"backend/internal/utils"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Submission queue for processing submissions
var (
	submissionQueue     = make(chan primitive.ObjectID, 100) // Buffer for 100 submissions
	submissionQueueLock sync.Mutex
	isProcessing        = false
)

// Initialize the submissions directory
func init() {
	// Create the submissions directory if it doesn't exist
	submissionsDir := "./submissions"
	if err := os.MkdirAll(submissionsDir, 0755); err != nil {
		log.Printf("Failed to create submissions directory: %v", err)
	}
}

// SubmitSolutionHandler handles code submissions from users
func SubmitSolutionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, "Method not allowed. Only POST is accepted.", http.StatusMethodNotAllowed)
		return
	}

	// Start the submission processing queue if it's not already running
	go startSubmissionProcessor()

	// Get user ID from JWT token
	cookie, err := r.Cookie("authToken")
	if err != nil {
		utils.SendJSONError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	tokenStr := cookie.Value
	claims := &types.Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})

	if err != nil || !token.Valid {
		utils.SendJSONError(w, "Invalid authentication token", http.StatusUnauthorized)
		return
	}

	userID, err := primitive.ObjectIDFromHex(claims.UserID)
	if err != nil {
		utils.SendJSONError(w, "Invalid user ID in token", http.StatusBadRequest)
		return
	}

	var submissionData models.SubmissionData

	if err := json.NewDecoder(r.Body).Decode(&submissionData); err != nil {
		utils.SendJSONError(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate submission data
	if submissionData.ProblemID == "" || submissionData.Language == "" || submissionData.Code == "" {
		utils.SendJSONError(w, "Problem ID, language, and code are required", http.StatusBadRequest)
		return
	}

	// Create submission record
	submission := models.Submission{
		UserID:      userID,
		ProblemID:   submissionData.ProblemID,
		Language:    submissionData.Language,
		Status:      models.StatusPending, // Initially set as pending
		SubmittedAt: time.Now(),
	}

	// Save to database
	submissionsCollection := database.GetCollection("OJ", "submissions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := submissionsCollection.InsertOne(ctx, submission)
	if err != nil {
		log.Printf("Failed to save submission: %v", err)
		utils.SendJSONError(w, "Failed to process submission", http.StatusInternalServerError)
		return
	}

	// Get the inserted ID
	submissionID, ok := result.InsertedID.(primitive.ObjectID)
	if !ok {
		log.Printf("Failed to get submission ID")
		utils.SendJSONError(w, "Failed to process submission", http.StatusInternalServerError)
		return
	}

	// If the language is pseudocode, convert it to Python before saving and processing
	if submission.Language == "pseudocode" {
		conversionCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		pythonCode, err := ai.ConvertPseudocodeToPython(conversionCtx, submissionData.Code)
		if err != nil {
			utils.SendJSONError(w, "Failed to convert pseudocode to Python: "+err.Error(), http.StatusInternalServerError)
			return
		}
		// We'll run the Python code, but save the original pseudocode for reference
		// The python code will be saved in a separate file in the submission directory
		// Let's create the submission directory first.
		submissionDir := filepath.Join("./submissions", submissionID.Hex())
		if err := os.MkdirAll(submissionDir, 0755); err != nil {
			log.Printf("Failed to create submission directory: %v", err)
			utils.SendJSONError(w, "Server error during submission", http.StatusInternalServerError)
			return
		}

		// Save the original pseudocode
		pseudocodePath := filepath.Join(submissionDir, "code.pseudo")
		if err := os.WriteFile(pseudocodePath, []byte(submissionData.Code), 0644); err != nil {
			log.Printf("Failed to write pseudocode file: %v", err)
			utils.SendJSONError(w, "Server error during submission", http.StatusInternalServerError)
			return
		}

		// Save the converted Python code
		pythonCodePath := filepath.Join(submissionDir, "code.py")
		if err := os.WriteFile(pythonCodePath, []byte(pythonCode), 0644); err != nil {
			log.Printf("Failed to write python code file: %v", err)
			utils.SendJSONError(w, "Server error during submission", http.StatusInternalServerError)
			return
		}
		// Queue the submission for processing
		submissionQueue <- submissionID
	} else {
		// For other languages, save the code directly
		submissionDir := filepath.Join("./submissions", submissionID.Hex())
		if err := os.MkdirAll(submissionDir, 0755); err != nil {
			log.Printf("Failed to create submission directory: %v", err)
			utils.SendJSONError(w, "Server error during submission", http.StatusInternalServerError)
			return
		}

		fileExtension := utils.GetFileExtension(submission.Language)
		codeFilePath := filepath.Join(submissionDir, "code"+fileExtension)
		if err := os.WriteFile(codeFilePath, []byte(submissionData.Code), 0644); err != nil {
			log.Printf("Failed to write code file: %v", err)
			utils.SendJSONError(w, "Server error during submission", http.StatusInternalServerError)
			return
		}

		// Queue the submission for processing
		submissionQueue <- submissionID
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]string{
		"message":       "Submission received and is being processed.",
		"submission_id": result.InsertedID.(primitive.ObjectID).Hex(),
	})
}

// Start the submission processor if it's not already running
func startSubmissionProcessor() {
	submissionQueueLock.Lock()
	if !isProcessing {
		isProcessing = true
		go processSubmissionQueue()
		log.Println("Submission processor started.")
	}
	submissionQueueLock.Unlock()
}

// Process submissions in the queue
func processSubmissionQueue() {
	for submissionID := range submissionQueue {
		// Process the submission
		processSubmission(submissionID)

		// Check if queue is empty
		submissionQueueLock.Lock()
		if len(submissionQueue) == 0 {
			isProcessing = false
			submissionQueueLock.Unlock()
			break
		}
		submissionQueueLock.Unlock()
	}
}

// Process a single submission
func processSubmission(submissionID primitive.ObjectID) {
	log.Printf("Processing submission: %s", submissionID.Hex())

	// Get submission details from database
	submissionsCollection := database.GetCollection("OJ", "submissions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var submission models.Submission
	err := submissionsCollection.FindOne(ctx, bson.M{"_id": submissionID}).Decode(&submission)
	if err != nil {
		log.Printf("Failed to retrieve submission %s: %v", submissionID.Hex(), err)
		updateSubmissionStatus(submissionID, models.StatusRuntimeError, 0, 0, 0, 0, "", "", nil)
		return
	}

	// Get problem details to know test cases and time limits
	problemsCollection := database.GetCollection("OJ", "problems")
	var problem models.Problem
	err = problemsCollection.FindOne(ctx, bson.M{"problem_id": submission.ProblemID}).Decode(&problem)
	if err != nil {
		log.Printf("Failed to retrieve problem %s: %v", submission.ProblemID, err)
		updateSubmissionStatus(submissionID, models.StatusRuntimeError, 0, 0, 0, 0, "", "", nil)
		return
	}

	// Get test cases for the problem
	testCasesCollection := database.GetCollection("OJ", "test_cases")
	findOptions := options.Find().SetSort(bson.D{{Key: "sequence_number", Value: 1}})
	cursor, err := testCasesCollection.Find(ctx, bson.M{"problem_db_id": problem.ID}, findOptions)
	if err != nil {
		log.Printf("Failed to find test cases for problem %s: %v", submission.ProblemID, err)
		updateSubmissionStatus(submissionID, models.StatusRuntimeError, 0, 0, 0, 0, "", "", nil)
		return
	}
	defer cursor.Close(ctx)

	var testCases []models.TestCase
	if err = cursor.All(ctx, &testCases); err != nil {
		log.Printf("Failed to decode test cases for problem %s: %v", submission.ProblemID, err)
		updateSubmissionStatus(submissionID, models.StatusRuntimeError, 0, 0, 0, 0, "", "", nil)
		return
	}

	if len(testCases) == 0 {
		log.Printf("No test cases found for problem %s", submission.ProblemID)
		// If there are no test cases, we can consider the submission accepted by default.
		updateSubmissionStatus(submissionID, models.StatusAccepted, 0, 0, 0, 0, "", "", nil)
		return
	}

	// Read code file
	submissionDir := filepath.Join("./submissions", submissionID.Hex())
	fileExtension := utils.GetFileExtension(submission.Language)
	codeFilePath := filepath.Join(submissionDir, "code"+fileExtension)
	codeBytes, err := os.ReadFile(codeFilePath)
	if err != nil {
		log.Printf("Failed to read code file for submission %s: %v", submissionID.Hex(), err)
		updateSubmissionStatus(submissionID, models.StatusRuntimeError, 0, 0, 0, 0, "", "", nil)
		return
	}
	code := string(codeBytes)

	// Execute code against each test case using the centralized function
	var testCaseInputs []string
	for _, tc := range testCases {
		testCaseInputs = append(testCaseInputs, tc.Input)
	}

	executionResult, err := runCodeAgainstTestCases(context.Background(), submission.Language, submission.ProblemID, code, testCaseInputs)
	if err != nil {
		log.Printf("runCodeAgainstTestCases failed for submission %s: %v", submissionID.Hex(), err)
		updateSubmissionStatus(submissionID, models.StatusRuntimeError, 0, 0, 0, 0, "", "", nil)
		return
	}

	// Process the results
	var totalExecutionTimeMs, totalMemoryUsedKB, testCasesPassed int
	var finalStatus models.SubmissionStatus = models.StatusAccepted
	var firstFailedResult *models.SubmissionResult
	var testResultsLog strings.Builder

	submissionResultsCollection := database.GetCollection("OJ", "submission_results")

	for i, result := range executionResult.Results {
		tc := testCases[i]
		submissionResult := models.SubmissionResult{
			SubmissionID:    submissionID,
			TestCaseID:      tc.ID,
			SequenceNumber:  tc.SequenceNumber,
			Input:           tc.Input,
			ExpectedOutput:  tc.ExpectedOutput,
			ActualOutput:    result.Stdout,
			ExecutionTimeMs: int(result.ExecutionTimeMs),
			MemoryUsedKB:    result.MemoryUsedKB,
			Error:           result.Stderr,
		}

		if result.Status != "success" {
			if result.Status == "timeout" {
				submissionResult.Status = models.TestResultStatusTimeLimitExceeded
				if finalStatus == models.StatusAccepted {
					finalStatus = models.StatusTimeLimitExceeded
				}
			} else {
				submissionResult.Status = models.TestResultStatusRuntimeError
				if finalStatus == models.StatusAccepted {
					finalStatus = models.StatusRuntimeError
				}
			}
		} else if strings.TrimSpace(result.Stdout) != strings.TrimSpace(tc.ExpectedOutput) {
			submissionResult.Status = models.TestResultStatusWrongAnswer
			if finalStatus == models.StatusAccepted {
				finalStatus = models.StatusWrongAnswer
			}
		} else {
			submissionResult.Status = models.TestResultStatusPassed
			testCasesPassed++
		}

		totalExecutionTimeMs += int(result.ExecutionTimeMs)
		totalMemoryUsedKB += result.MemoryUsedKB

		// Save the result of this test case
		_, err = submissionResultsCollection.InsertOne(ctx, submissionResult)
		if err != nil {
			log.Printf("Failed to save submission result for submission %s, test case %d: %v", submissionID.Hex(), i+1, err)
		}

		// Append to the log string
		testResultsLog.WriteString(fmt.Sprintf("--- Test Case %d ---\n", i+1))
		testResultsLog.WriteString(fmt.Sprintf("Input: %s\n", tc.Input))
		testResultsLog.WriteString(fmt.Sprintf("Expected Output: %s\n", tc.ExpectedOutput))
		testResultsLog.WriteString(fmt.Sprintf("Actual Output: %s\n", submissionResult.ActualOutput))
		testResultsLog.WriteString(fmt.Sprintf("Status: %s\n", submissionResult.Status))
		if submissionResult.Error != "" {
			testResultsLog.WriteString(fmt.Sprintf("Error: %s\n", submissionResult.Error))
		}
		testResultsLog.WriteString("\n")

		if submissionResult.Status != models.TestResultStatusPassed && firstFailedResult == nil {
			firstFailedResult = &submissionResult
		}
	}

	// Write the test results log to a file
	logFilePath := filepath.Join(submissionDir, "test_results.log")
	if err := os.WriteFile(logFilePath, []byte(testResultsLog.String()), 0644); err != nil {
		log.Printf("Failed to write test results log for submission %s: %v", submissionID.Hex(), err)
	}

	// Update overall submission status
	var timeComplexity, memoryComplexity string
	if finalStatus == models.StatusAccepted {
		// Perform complexity analysis only if all test cases pass
		analysisCtx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		defer cancel()

		complexity, err := ai.AnalyzeCodeComplexity(analysisCtx, code, submission.Language)
		if err != nil {
			log.Printf("Failed to analyze code complexity for submission %s: %v", submissionID.Hex(), err)
		} else if complexity != nil {
			timeComplexity = complexity.TimeComplexity
			memoryComplexity = complexity.MemoryComplexity
		}
	}

	averageExecutionTime := 0
	if len(testCases) > 0 {
		averageExecutionTime = totalExecutionTimeMs / len(testCases)
	}
	averageMemoryUsage := 0
	if len(testCases) > 0 {
		averageMemoryUsage = totalMemoryUsedKB / len(testCases)
	}

	updateSubmissionStatus(submissionID, finalStatus, averageExecutionTime, averageMemoryUsage, testCasesPassed, len(testCases), timeComplexity, memoryComplexity, firstFailedResult)

	// After processing, check if the submission was accepted and trigger updates.
	// We run this in a goroutine so it doesn't block the submission processing flow.
	go func() {
		if finalStatus == models.StatusAccepted {
			// Find the associated problem to get its ObjectID
			var problem models.Problem
			err := problemsCollection.FindOne(context.Background(), bson.M{"problem_id": submission.ProblemID}).Decode(&problem)
			if err != nil {
				log.Printf("Could not find problem with problem_id %s to update user skills: %v", submission.ProblemID, err)
				return
			}
			problemObjID := problem.ID // This is the actual problem's ObjectID
			fmt.Println("Problem ObjectID:", problemObjID)
			fmt.Println("Problem ObjectID Hex:", problemObjID.Hex())
			fmt.Println("Actual problem_id in submission:", submission.ProblemID)
			fmt.Println("User ID:", submission.UserID)

			if err := UpdateUserSkill(submission.UserID, submission.ProblemID, problem.Tags, problem.Difficulty, true); err != nil {
				log.Printf("Failed to update skills for submission %s: %v", submissionID.Hex(), err)
			} else {
				log.Printf("Successfully updated skills for submission %s", submissionID.Hex())
			}

			// Record daily check-in if submission was accepted
			if _, err := recordCheckinInternal(context.Background(), submission.UserID); err != nil {
				log.Printf("Failed to record check-in for submission %s: %v", submissionID.Hex(), err)
			} else {
				log.Printf("Successfully recorded check-in for submission %s", submissionID.Hex())
			}
		}
	}()
}

// Update submission status in database
func updateSubmissionStatus(submissionID primitive.ObjectID, status models.SubmissionStatus,
	executionTimeMs, memoryUsedKB, testCasesPassed, testCasesTotal int,
	timeComplexity, memoryComplexity string, firstFailedResult *models.SubmissionResult,
) {
	submissionsCollection := database.GetCollection("OJ", "submissions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// First get the submission to know the problem ID
	var submission models.Submission
	err := submissionsCollection.FindOne(ctx, bson.M{"_id": submissionID}).Decode(&submission)
	if err != nil {
		log.Printf("Failed to get submission %s: %v", submissionID.Hex(), err)
		return
	}

	// Update the submission status
	update := bson.M{
		"$set": bson.M{
			"status":            status,
			"execution_time_ms": executionTimeMs,
			"memory_used_kb":    memoryUsedKB,
			"test_cases_passed": testCasesPassed,
			"test_cases_total":  testCasesTotal,
			"time_complexity":   timeComplexity,
			"memory_complexity": memoryComplexity,
		},
	}

	if firstFailedResult != nil {
		update["$set"].(bson.M)["failed_test_case_details"] = bson.M{
			"input":           firstFailedResult.Input,
			"expected_output": firstFailedResult.ExpectedOutput,
			"actual_output":   firstFailedResult.ActualOutput,
			"error":           firstFailedResult.Error,
		}
	}

	_, err = submissionsCollection.UpdateOne(ctx, bson.M{"_id": submissionID}, update)
	if err != nil {
		log.Printf("Failed to update submission status for %s: %v", submissionID.Hex(), err)
		return
	}

	log.Printf("Successfully updated submission %s with status: %s", submissionID.Hex(), status)

	// After updating the submission, also update problem-wide statistics in a separate goroutine
	go func() {
		// Update problem acceptance rate
		updateProblemAcceptanceRate(context.Background(), submission.ProblemID)

		// If the solution was accepted, update complexity stats
		if status == models.StatusAccepted && timeComplexity != "" && memoryComplexity != "" {
			updateProblemStats(context.Background(), submission.ProblemID, timeComplexity, memoryComplexity)
		}
	}()
}

// updateProblemAcceptanceRate recalculates and updates the acceptance rate for a problem
func updateProblemAcceptanceRate(ctx context.Context, problemID string) {
	submissionsCollection := database.GetCollection("OJ", "submissions")
	problemsCollection := database.GetCollection("OJ", "problems")

	// Calculate acceptance rate using the utility function
	acceptanceRate, err := utils.CalculateAcceptanceRate(ctx, submissionsCollection, problemID)
	if err != nil {
		log.Printf("Failed to calculate acceptance rate for problem %s: %v", problemID, err)
		return
	}

	// Update the problem with the new acceptance rate
	_, err = problemsCollection.UpdateOne(
		ctx,
		bson.M{"problem_id": problemID},
		bson.M{"$set": bson.M{"acceptance_rate": acceptanceRate}},
	)
	if err != nil {
		log.Printf("Failed to update problem acceptance rate for %s: %v", problemID, err)
		return
	}

	log.Printf("Updated acceptance rate for problem %s: %.2f%%", problemID, acceptanceRate)
}

// updateProblemStats updates the aggregated complexity statistics for a problem.
func updateProblemStats(ctx context.Context, problemID, timeComplexity, memoryComplexity string) {
	statsCollection := database.GetCollection("OJ", "problem_stats")

	filter := bson.M{"problem_id": problemID}
	update := bson.M{
		"$inc": bson.M{
			"total_accepted_submissions":                                       1,
			fmt.Sprintf("time_complexity_distribution.%s", timeComplexity):     1,
			fmt.Sprintf("memory_complexity_distribution.%s", memoryComplexity): 1,
		},
		"$set": bson.M{
			"last_updated_at": time.Now(),
			"problem_id":      problemID, // Ensure problem_id is set on upsert
		},
	}
	opts := options.Update().SetUpsert(true)

	_, err := statsCollection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		log.Printf("Failed to update problem stats for %s: %v", problemID, err)
	}
}

// Execute code with given input
func executeCode(ctx context.Context, language, code, input string, timeLimitMs int) (*types.ExecutionResult, error) {
	// For now, we're assuming the execution service can handle a raw string of code.
	// In a real implementation, you might need to write this to a temporary file.

	result, err := ai.ExecuteCode(language, code, input)
	if err != nil {
		return nil, fmt.Errorf("execution failed: %w", err)
	}

	// Convert ai.ExecuteCodeResult to types.ExecutionResult
	executionResult := &types.ExecutionResult{
		Status:          result.Status,
		Output:          result.Output,
		ExecutionTimeMs: result.ExecutionTimeMs,
		MemoryUsedKB:    result.MemoryUsedKB,
	}

	return executionResult, nil
}

// GetSubmissionsHandler retrieves a list of submissions
func GetSubmissionsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendJSONError(w, "Method not allowed. Only GET is accepted.", http.StatusMethodNotAllowed)
		return
	}

	// Get user ID from JWT token (for filtering by user if needed)
	var userID primitive.ObjectID
	var isAdmin bool

	cookie, err := r.Cookie("authToken")
	if err == nil {
		// Token exists, parse it
		tokenStr := cookie.Value
		claims := &types.Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})

		if err == nil && token.Valid {
			userID, _ = primitive.ObjectIDFromHex(claims.UserID)
			isAdmin = claims.IsAdmin
		}
	}

	// Parse query parameters
	query := r.URL.Query()
	problemName := query.Get("problem_name")
	userIDParam := query.Get("user_id")
	filterByUser := query.Get("my_submissions") == "true"
	status := query.Get("status")
	language := query.Get("language")

	// Set up pagination
	limit := 50
	if limitStr := query.Get("limit"); limitStr != "" {
		if limitNum, err := utils.ParseInt(limitStr); err == nil && limitNum > 0 {
			limit = limitNum
		}
	}

	page := 0
	if pageStr := query.Get("page"); pageStr != "" {
		if pageNum, err := utils.ParseInt(pageStr); err == nil && pageNum > 0 {
			page = pageNum - 1 // Convert to 0-indexed
		}
	}

	// Build the filter
	filter := bson.M{}

	// Filter by status if provided
	if status != "" && status != "all" {
		filter["status"] = status
	}

	// Filter by language if provided
	if language != "" && language != "all" {
		filter["language"] = language
	}

	// Filter by user ID if provided or if "my_submissions" is true
	if userIDParam != "" && isAdmin {
		// Only admins can see other users' submissions
		userObjID, err := primitive.ObjectIDFromHex(userIDParam)
		if err == nil {
			filter["user_id"] = userObjID
		}
	} else if filterByUser && !userID.IsZero() {
		// User wants to see their own submissions
		filter["user_id"] = userID
	}

	// Query database
	submissionsCollection := database.GetCollection("OJ", "submissions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Set up options for sorting and pagination
	findOptions := options.Find().
		SetSort(bson.D{{Key: "submitted_at", Value: -1}}). // Sort by newest first
		SetSkip(int64(page * limit)).
		SetLimit(int64(limit))

	// We need to handle problem name search separately
	var submissions []models.Submission
	var submissionItems []models.SubmissionListItem
	var totalCount int64

	if problemName != "" {
		// First get all problem IDs matching the name search
		problemsCollection := database.GetCollection("OJ", "problems")
		problemFilter := bson.M{"title": bson.M{"$regex": problemName, "$options": "i"}} // Case-insensitive search

		problemCursor, err := problemsCollection.Find(ctx, problemFilter)
		if err != nil {
			log.Printf("Failed to query problems by name: %v", err)
			utils.SendJSONError(w, "Failed to search by problem name", http.StatusInternalServerError)
			return
		}
		defer problemCursor.Close(ctx)

		var matchingProblems []models.Problem
		if err := problemCursor.All(ctx, &matchingProblems); err != nil {
			log.Printf("Failed to decode problems: %v", err)
			utils.SendJSONError(w, "Failed to process problem data", http.StatusInternalServerError)
			return
		}

		if len(matchingProblems) > 0 {
			// Get problem IDs from matching problems
			var problemIDs []string
			for _, problem := range matchingProblems {
				problemIDs = append(problemIDs, problem.ProblemID)
			}

			// Add problem IDs to filter
			filter["problem_id"] = bson.M{"$in": problemIDs}
		} else {
			// If no problems match, return empty results
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"submissions": []models.SubmissionListItem{},
				"pagination": map[string]interface{}{
					"total":       0,
					"page":        page + 1,
					"limit":       limit,
					"total_pages": 0,
				},
			})
			return
		}
	}

	// Execute the query
	cursor, err := submissionsCollection.Find(ctx, filter, findOptions)
	if err != nil {
		log.Printf("Failed to query submissions: %v", err)
		utils.SendJSONError(w, "Failed to retrieve submissions", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	// Decode submissions
	if err := cursor.All(ctx, &submissions); err != nil {
		log.Printf("Failed to decode submissions: %v", err)
		utils.SendJSONError(w, "Failed to process submissions data", http.StatusInternalServerError)
		return
	}

	// Fetch user and problem details to create list items
	userCache := make(map[primitive.ObjectID]string)
	problemCache := make(map[string]string)

	usersCollection := database.GetCollection("OJ", "users")
	problemsCollection := database.GetCollection("OJ", "problems")

	for _, sub := range submissions {
		item := models.SubmissionListItem{
			ID:              sub.ID,
			UserID:          sub.UserID,
			ProblemID:       sub.ProblemID,
			Language:        sub.Language,
			Status:          sub.Status,
			ExecutionTimeMs: sub.ExecutionTimeMs,
			SubmittedAt:     sub.SubmittedAt,
		}

		// Get username (use cache to avoid repeated DB lookups)
		if username, found := userCache[sub.UserID]; found {
			item.Username = username
		} else {
			var user models.User
			if err := usersCollection.FindOne(ctx, bson.M{"_id": sub.UserID}).Decode(&user); err == nil {
				item.Username = user.Username
				userCache[sub.UserID] = user.Username
			}
		}

		// Get problem title
		if title, found := problemCache[sub.ProblemID]; found {
			item.ProblemTitle = title
		} else {
			var problem models.Problem
			if err := problemsCollection.FindOne(ctx, bson.M{"problem_id": sub.ProblemID}).Decode(&problem); err == nil {
				item.ProblemTitle = problem.Title
				problemCache[sub.ProblemID] = problem.Title
			}
		}

		submissionItems = append(submissionItems, item)
	}

	// Count total submissions for pagination info
	totalCount, err = submissionsCollection.CountDocuments(ctx, filter)
	if err != nil {
		log.Printf("Failed to count submissions: %v", err)
		// Continue anyway, just won't have accurate pagination info
	}

	// Return response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"submissions": submissionItems,
		"pagination": map[string]interface{}{
			"total":       totalCount,
			"page":        page + 1, // Convert back to 1-indexed for client
			"limit":       limit,
			"total_pages": (totalCount + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetSubmissionDetailsHandler retrieves details of a specific submission
func GetSubmissionDetailsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendJSONError(w, "Method not allowed. Only GET is accepted.", http.StatusMethodNotAllowed)
		return
	}

	// Extract submission ID from URL
	path := r.URL.Path
	parts := strings.Split(path, "/")
	if len(parts) < 3 {
		utils.SendJSONError(w, "Invalid URL format", http.StatusBadRequest)
		return
	}
	submissionIDStr := parts[len(parts)-1]

	submissionID, err := primitive.ObjectIDFromHex(submissionIDStr)
	if err != nil {
		utils.SendJSONError(w, "Invalid submission ID format", http.StatusBadRequest)
		return
	}

	// Get user ID from JWT token
	var userID primitive.ObjectID
	var isAdmin bool

	cookie, err := r.Cookie("authToken")
	if err == nil {
		// Token exists, parse it
		tokenStr := cookie.Value
		claims := &types.Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})

		if err == nil && token.Valid {
			userID, _ = primitive.ObjectIDFromHex(claims.UserID)
			isAdmin = claims.IsAdmin
		}
	}

	// Query database
	submissionsCollection := database.GetCollection("OJ", "submissions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var submission models.Submission
	err = submissionsCollection.FindOne(ctx, bson.M{"_id": submissionID}).Decode(&submission)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.SendJSONError(w, "Submission not found", http.StatusNotFound)
		} else {
			log.Printf("Failed to retrieve submission: %v", err)
			utils.SendJSONError(w, "Failed to retrieve submission details", http.StatusInternalServerError)
		}
		return
	}

	// Check if user has permission to view this submission
	if !isAdmin && submission.UserID != userID {
		utils.SendJSONError(w, "You don't have permission to view this submission", http.StatusForbidden)
		return
	}

	// Fetch associated user and problem details
	var user models.User
	var problem models.Problem

	usersCollection := database.GetCollection("OJ", "users")
	problemsCollection := database.GetCollection("OJ", "problems")

	_ = usersCollection.FindOne(ctx, bson.M{"_id": submission.UserID}).Decode(&user)
	_ = problemsCollection.FindOne(ctx, bson.M{"problem_id": submission.ProblemID}).Decode(&problem)

	// Read code file
	submissionDir := filepath.Join("./submissions", submissionID.Hex())
	var codeFilePath string
	if submission.Language == "pseudocode" {
		codeFilePath = filepath.Join(submissionDir, "code.py")
	} else {
		fileExtension := utils.GetFileExtension(submission.Language)
		codeFilePath = filepath.Join(submissionDir, "code"+fileExtension)
	}
	code, err := os.ReadFile(codeFilePath)
	if err != nil {
		log.Printf("Failed to read code file: %v", err)
		code = []byte("// Code file not found")
	}

	// Create response object
	response := struct {
		models.Submission
		Username              string                   `json:"username,omitempty"`
		ProblemTitle          string                   `json:"problem_title,omitempty"`
		Code                  string                   `json:"code,omitempty"`
		FailedTestCaseDetails *models.SubmissionResult `json:"failed_test_case_details,omitempty"`
	}{
		Submission:   submission,
		Username:     user.Username,
		ProblemTitle: problem.Title,
		Code:         string(code),
	}

	// If the submission failed, fetch the first failed test case result
	if submission.Status != models.StatusAccepted {
		var failedResult models.SubmissionResult
		submissionResultsCollection := database.GetCollection("OJ", "submission_results")
		err := submissionResultsCollection.FindOne(
			ctx,
			bson.M{
				"submission_id": submissionID,
				"status":        bson.M{"$ne": models.TestResultStatusPassed},
			},
			options.FindOne().SetSort(bson.D{{Key: "sequence_number", Value: 1}}),
		).Decode(&failedResult)

		if err == nil {
			response.FailedTestCaseDetails = &failedResult
		} else if err != mongo.ErrNoDocuments {
			log.Printf("Failed to retrieve failed test case for submission %s: %v", submissionID.Hex(), err)
		}
	}

	// Return response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
