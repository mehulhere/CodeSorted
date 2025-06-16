package handlers

import (
	"backend/internal/database"
	"backend/internal/models"
	"backend/internal/types"
	"backend/internal/utils"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// getJWTKey returns the JWT key from environment
func getJWTKey() []byte {
	key := os.Getenv("JWT_SECRET_KEY")
	if key == "" {
		log.Fatal("JWT_SECRET_KEY not set in environment variables")
	}
	return []byte(key)
}

// GetThreadsHandler retrieves threads for a specific problem
func GetThreadsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendJSONError(w, "Method not allowed. Only GET is accepted.", http.StatusMethodNotAllowed)
		return
	}

	// Extract problem ID from URL path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 6 {
		utils.SendJSONError(w, "Invalid URL format", http.StatusBadRequest)
		return
	}
	problemID := pathParts[4] // /api/discussions/problems/{problemId}/threads

	// Parse query parameters for pagination
	query := r.URL.Query()
	page, _ := strconv.Atoi(query.Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(query.Get("limit"))
	if limit < 1 || limit > 50 {
		limit = 10
	}
	skip := (page - 1) * limit

	// Query database
	threadsCollection := database.GetCollection("OJ", "threads")
	usersCollection := database.GetCollection("OJ", "users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Build filter
	filter := bson.M{"problem_id": problemID}

	// Find threads with pagination and sorting by creation date (newest first)
	findOptions := options.Find()
	findOptions.SetLimit(int64(limit))
	findOptions.SetSkip(int64(skip))
	findOptions.SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := threadsCollection.Find(ctx, filter, findOptions)
	if err != nil {
		log.Printf("Failed to query threads: %v", err)
		utils.SendJSONError(w, "Failed to retrieve threads", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	var threads []models.Thread
	if err := cursor.All(ctx, &threads); err != nil {
		log.Printf("Failed to decode threads: %v", err)
		utils.SendJSONError(w, "Failed to process threads data", http.StatusInternalServerError)
		return
	}

	// Create thread list items with user information
	var threadItems []models.ThreadListItem
	userCache := make(map[primitive.ObjectID]string)

	for _, thread := range threads {
		item := models.ThreadListItem{
			ID:           thread.ID,
			Title:        thread.Title,
			Content:      thread.Content,
			Upvotes:      thread.Upvotes,
			CommentCount: thread.CommentCount,
			CreatedAt:    thread.CreatedAt,
			IsLocked:     thread.IsLocked,
		}

		// Get username (use cache to avoid repeated DB lookups)
		if username, found := userCache[thread.UserID]; found {
			item.Username = username
		} else {
			var user models.User
			if err := usersCollection.FindOne(ctx, bson.M{"_id": thread.UserID}).Decode(&user); err == nil {
				item.Username = user.Username
				userCache[thread.UserID] = user.Username
			} else {
				item.Username = "Unknown User"
			}
		}

		threadItems = append(threadItems, item)
	}

	// Count total threads for pagination info
	totalCount, err := threadsCollection.CountDocuments(ctx, filter)
	if err != nil {
		log.Printf("Failed to count threads: %v", err)
		// Continue anyway, just won't have accurate pagination info
	}

	// Return response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"threads": threadItems,
		"pagination": map[string]interface{}{
			"total":       totalCount,
			"page":        page,
			"limit":       limit,
			"total_pages": (totalCount + int64(limit) - 1) / int64(limit),
		},
	})
}

// CreateThreadHandler creates a new discussion thread
func CreateThreadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, "Method not allowed. Only POST is accepted.", http.StatusMethodNotAllowed)
		return
	}

	// Get user ID from JWT token
	cookie, err := r.Cookie("authToken")
	if err != nil {
		utils.SendJSONError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	tokenStr := cookie.Value
	claims := &types.Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		return getJWTKey(), nil
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

	// Parse request body
	var payload models.CreateThreadPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.SendJSONError(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate payload
	if payload.ProblemID == "" || payload.Title == "" || payload.Content == "" {
		utils.SendJSONError(w, "Problem ID, title, and content are required", http.StatusBadRequest)
		return
	}

	// Verify problem exists
	problemsCollection := database.GetCollection("OJ", "problems")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var problem models.Problem
	err = problemsCollection.FindOne(ctx, bson.M{"problem_id": payload.ProblemID}).Decode(&problem)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.SendJSONError(w, "Problem not found", http.StatusNotFound)
		} else {
			log.Printf("Failed to verify problem: %v", err)
			utils.SendJSONError(w, "Failed to verify problem", http.StatusInternalServerError)
		}
		return
	}

	// Create thread
	thread := models.Thread{
		ProblemID:    payload.ProblemID,
		UserID:       userID,
		Title:        payload.Title,
		Content:      payload.Content,
		Upvotes:      0,
		Downvotes:    0,
		CommentCount: 0,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		IsLocked:     false,
	}

	// Save to database
	threadsCollection := database.GetCollection("OJ", "threads")
	result, err := threadsCollection.InsertOne(ctx, thread)
	if err != nil {
		log.Printf("Failed to save thread: %v", err)
		utils.SendJSONError(w, "Failed to create thread", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":   "Thread created successfully",
		"thread_id": result.InsertedID,
	})
}

// GetCommentsHandler retrieves comments for a specific thread
func GetCommentsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendJSONError(w, "Method not allowed. Only GET is accepted.", http.StatusMethodNotAllowed)
		return
	}

	// Extract thread ID from URL path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 6 {
		utils.SendJSONError(w, "Invalid URL format", http.StatusBadRequest)
		return
	}
	threadIDStr := pathParts[4] // /api/discussions/threads/{threadId}/comments

	threadID, err := primitive.ObjectIDFromHex(threadIDStr)
	if err != nil {
		utils.SendJSONError(w, "Invalid thread ID format", http.StatusBadRequest)
		return
	}

	// Parse query parameters for pagination
	query := r.URL.Query()
	page, _ := strconv.Atoi(query.Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(query.Get("limit"))
	if limit < 1 || limit > 50 {
		limit = 20
	}
	skip := (page - 1) * limit

	// Query database
	commentsCollection := database.GetCollection("OJ", "comments")
	usersCollection := database.GetCollection("OJ", "users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Build filter (exclude deleted comments)
	filter := bson.M{
		"thread_id":  threadID,
		"is_deleted": false,
	}

	// Find comments with pagination and sorting by creation date (oldest first)
	findOptions := options.Find()
	findOptions.SetLimit(int64(limit))
	findOptions.SetSkip(int64(skip))
	findOptions.SetSort(bson.D{{Key: "created_at", Value: 1}})

	cursor, err := commentsCollection.Find(ctx, filter, findOptions)
	if err != nil {
		log.Printf("Failed to query comments: %v", err)
		utils.SendJSONError(w, "Failed to retrieve comments", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	var comments []models.Comment
	if err := cursor.All(ctx, &comments); err != nil {
		log.Printf("Failed to decode comments: %v", err)
		utils.SendJSONError(w, "Failed to process comments data", http.StatusInternalServerError)
		return
	}

	// Create comment list items with user information
	var commentItems []models.CommentListItem
	userCache := make(map[primitive.ObjectID]string)

	for _, comment := range comments {
		item := models.CommentListItem{
			ID:        comment.ID,
			Content:   comment.Content,
			Upvotes:   comment.Upvotes,
			Downvotes: comment.Downvotes,
			CreatedAt: comment.CreatedAt,
			UpdatedAt: comment.UpdatedAt,
			IsDeleted: comment.IsDeleted,
		}

		// Get username (use cache to avoid repeated DB lookups)
		if username, found := userCache[comment.UserID]; found {
			item.Username = username
		} else {
			var user models.User
			if err := usersCollection.FindOne(ctx, bson.M{"_id": comment.UserID}).Decode(&user); err == nil {
				item.Username = user.Username
				userCache[comment.UserID] = user.Username
			} else {
				item.Username = "Unknown User"
			}
		}

		commentItems = append(commentItems, item)
	}

	// Count total comments for pagination info
	totalCount, err := commentsCollection.CountDocuments(ctx, filter)
	if err != nil {
		log.Printf("Failed to count comments: %v", err)
		// Continue anyway, just won't have accurate pagination info
	}

	// Return response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"comments": commentItems,
		"pagination": map[string]interface{}{
			"total":       totalCount,
			"page":        page,
			"limit":       limit,
			"total_pages": (totalCount + int64(limit) - 1) / int64(limit),
		},
	})
}

// CreateCommentHandler creates a new comment in a thread
func CreateCommentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, "Method not allowed. Only POST is accepted.", http.StatusMethodNotAllowed)
		return
	}

	// Get user ID from JWT token
	cookie, err := r.Cookie("authToken")
	if err != nil {
		utils.SendJSONError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	tokenStr := cookie.Value
	claims := &types.Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		return getJWTKey(), nil
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

	// Parse request body
	var payload models.CreateCommentPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.SendJSONError(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate payload
	if payload.ThreadID == "" || payload.Content == "" {
		utils.SendJSONError(w, "Thread ID and content are required", http.StatusBadRequest)
		return
	}

	threadID, err := primitive.ObjectIDFromHex(payload.ThreadID)
	if err != nil {
		utils.SendJSONError(w, "Invalid thread ID format", http.StatusBadRequest)
		return
	}

	// Verify thread exists and is not locked
	threadsCollection := database.GetCollection("OJ", "threads")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var thread models.Thread
	err = threadsCollection.FindOne(ctx, bson.M{"_id": threadID}).Decode(&thread)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.SendJSONError(w, "Thread not found", http.StatusNotFound)
		} else {
			log.Printf("Failed to verify thread: %v", err)
			utils.SendJSONError(w, "Failed to verify thread", http.StatusInternalServerError)
		}
		return
	}

	if thread.IsLocked {
		utils.SendJSONError(w, "Thread is locked for comments", http.StatusForbidden)
		return
	}

	// Create comment
	comment := models.Comment{
		ThreadID:  threadID,
		UserID:    userID,
		Content:   payload.Content,
		Upvotes:   0,
		Downvotes: 0,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		IsDeleted: false,
	}

	// Save to database
	commentsCollection := database.GetCollection("OJ", "comments")
	result, err := commentsCollection.InsertOne(ctx, comment)
	if err != nil {
		log.Printf("Failed to save comment: %v", err)
		utils.SendJSONError(w, "Failed to create comment", http.StatusInternalServerError)
		return
	}

	// Update thread comment count
	_, err = threadsCollection.UpdateOne(
		ctx,
		bson.M{"_id": threadID},
		bson.M{"$inc": bson.M{"comment_count": 1}},
	)
	if err != nil {
		log.Printf("Failed to update thread comment count: %v", err)
		// Don't fail the request, comment was created successfully
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":    "Comment created successfully",
		"comment_id": result.InsertedID,
	})
}

// DeleteCommentHandler soft deletes a comment
func DeleteCommentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		utils.SendJSONError(w, "Method not allowed. Only DELETE is accepted.", http.StatusMethodNotAllowed)
		return
	}

	// Get user ID from JWT token
	cookie, err := r.Cookie("authToken")
	if err != nil {
		utils.SendJSONError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	tokenStr := cookie.Value
	claims := &types.Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		return getJWTKey(), nil
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

	// Extract comment ID from URL path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		utils.SendJSONError(w, "Invalid URL format", http.StatusBadRequest)
		return
	}
	commentIDStr := pathParts[3] // /api/comments/{commentId}

	commentID, err := primitive.ObjectIDFromHex(commentIDStr)
	if err != nil {
		utils.SendJSONError(w, "Invalid comment ID format", http.StatusBadRequest)
		return
	}

	// Get comment to verify ownership
	commentsCollection := database.GetCollection("OJ", "comments")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var comment models.Comment
	err = commentsCollection.FindOne(ctx, bson.M{"_id": commentID}).Decode(&comment)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			utils.SendJSONError(w, "Comment not found", http.StatusNotFound)
		} else {
			log.Printf("Failed to retrieve comment: %v", err)
			utils.SendJSONError(w, "Failed to retrieve comment", http.StatusInternalServerError)
		}
		return
	}

	// Check if user owns the comment or is admin
	if comment.UserID != userID && !claims.IsAdmin {
		utils.SendJSONError(w, "You don't have permission to delete this comment", http.StatusForbidden)
		return
	}

	// Soft delete the comment
	_, err = commentsCollection.UpdateOne(
		ctx,
		bson.M{"_id": commentID},
		bson.M{
			"$set": bson.M{
				"is_deleted": true,
				"updated_at": time.Now(),
			},
		},
	)
	if err != nil {
		log.Printf("Failed to delete comment: %v", err)
		utils.SendJSONError(w, "Failed to delete comment", http.StatusInternalServerError)
		return
	}

	// Update thread comment count
	threadsCollection := database.GetCollection("OJ", "threads")
	_, err = threadsCollection.UpdateOne(
		ctx,
		bson.M{"_id": comment.ThreadID},
		bson.M{"$inc": bson.M{"comment_count": -1}},
	)
	if err != nil {
		log.Printf("Failed to update thread comment count: %v", err)
		// Don't fail the request, comment was deleted successfully
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Comment deleted successfully",
	})
}

// VoteHandler handles upvoting/downvoting threads and comments
func VoteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, "Method not allowed. Only POST is accepted.", http.StatusMethodNotAllowed)
		return
	}

	// Get user ID from JWT token
	cookie, err := r.Cookie("authToken")
	if err != nil {
		utils.SendJSONError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	tokenStr := cookie.Value
	claims := &types.Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		return getJWTKey(), nil
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

	// Parse request body
	var payload models.VotePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.SendJSONError(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate payload
	if payload.TargetID == "" || payload.Type == "" {
		utils.SendJSONError(w, "Target ID and type are required", http.StatusBadRequest)
		return
	}

	if payload.Type != "thread" && payload.Type != "comment" {
		utils.SendJSONError(w, "Type must be 'thread' or 'comment'", http.StatusBadRequest)
		return
	}

	if payload.Value != -1 && payload.Value != 0 && payload.Value != 1 {
		utils.SendJSONError(w, "Value must be -1 (downvote), 0 (remove vote), or 1 (upvote)", http.StatusBadRequest)
		return
	}

	targetID, err := primitive.ObjectIDFromHex(payload.TargetID)
	if err != nil {
		utils.SendJSONError(w, "Invalid target ID format", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	votesCollection := database.GetCollection("OJ", "votes")

	// Check if user has already voted on this target
	var existingVote models.Vote
	err = votesCollection.FindOne(ctx, bson.M{
		"user_id":   userID,
		"target_id": targetID,
		"type":      payload.Type,
	}).Decode(&existingVote)

	var oldVoteValue int
	if err == nil {
		// User has already voted
		oldVoteValue = existingVote.Value
	} else if err != mongo.ErrNoDocuments {
		log.Printf("Failed to check existing vote: %v", err)
		utils.SendJSONError(w, "Failed to process vote", http.StatusInternalServerError)
		return
	}

	// Calculate vote change
	voteChange := payload.Value - oldVoteValue

	// Update or create vote record
	if payload.Value == 0 {
		// Remove vote
		if err == nil {
			_, err = votesCollection.DeleteOne(ctx, bson.M{"_id": existingVote.ID})
			if err != nil {
				log.Printf("Failed to remove vote: %v", err)
				utils.SendJSONError(w, "Failed to remove vote", http.StatusInternalServerError)
				return
			}
		}
	} else {
		// Create or update vote
		vote := models.Vote{
			UserID:    userID,
			TargetID:  targetID,
			Type:      payload.Type,
			Value:     payload.Value,
			CreatedAt: time.Now(),
		}

		if err == nil {
			// Update existing vote
			_, err = votesCollection.UpdateOne(
				ctx,
				bson.M{"_id": existingVote.ID},
				bson.M{"$set": bson.M{
					"value":      payload.Value,
					"created_at": time.Now(),
				}},
			)
		} else {
			// Create new vote
			_, err = votesCollection.InsertOne(ctx, vote)
		}

		if err != nil {
			log.Printf("Failed to save vote: %v", err)
			utils.SendJSONError(w, "Failed to save vote", http.StatusInternalServerError)
			return
		}
	}

	// Update vote counts on the target
	var collection *mongo.Collection
	if payload.Type == "thread" {
		collection = database.GetCollection("OJ", "threads")
	} else {
		collection = database.GetCollection("OJ", "comments")
	}

	updateDoc := bson.M{}
	if voteChange > 0 {
		updateDoc["$inc"] = bson.M{"upvotes": voteChange}
		if oldVoteValue < 0 {
			updateDoc["$inc"].(bson.M)["downvotes"] = -oldVoteValue
		}
	} else if voteChange < 0 {
		updateDoc["$inc"] = bson.M{"downvotes": -voteChange}
		if oldVoteValue > 0 {
			updateDoc["$inc"].(bson.M)["upvotes"] = -oldVoteValue
		}
	}

	if len(updateDoc) > 0 {
		_, err = collection.UpdateOne(ctx, bson.M{"_id": targetID}, updateDoc)
		if err != nil {
			log.Printf("Failed to update vote counts: %v", err)
			utils.SendJSONError(w, "Failed to update vote counts", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Vote processed successfully",
	})
}
