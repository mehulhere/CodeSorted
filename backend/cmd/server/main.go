package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"backend/internal/ai"
	"backend/internal/database"
	"backend/internal/handlers"
	"backend/internal/middleware"
	"backend/internal/models"
	"context"

	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	err := godotenv.Load(".env")
	if err != nil {
		if !os.IsNotExist(err) {
			log.Printf("Warning: Errr loading .env file in main.go: %v. Using environment variables instead.\n", err)
		}
		// If the error is just that the file doesn't exist, we don't need to log it
		// as environment variables will be used anyway.
	}

	// Get MongoDB URI from environment
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		log.Fatal("MONGO_URI not set in environment variables")
	}

	// Initialize MongoDB connection
	err = database.ConnectDB(mongoURI)
	if err != nil {
		log.Fatal(err)
	}
	defer database.DisconnectDB()

	// Initialize AI Client
	if err := ai.InitAIClient(context.Background()); err != nil {
		log.Fatalf("Failed to initialize AI client: %v", err)
	}

	// Initialize rate limit collection
	if err := middleware.InitRateLimitCollection(); err != nil {
		log.Fatalf("Failed to initialize rate limit collection: %v", err)
	}

	// Set JWT key
	secret := os.Getenv("JWT_SECRET_KEY")
	if secret == "" {
		log.Fatal("JWT_SECRET_KEY not set in environment variables")
	}
	// jwtKey := []byte(secret)

	// Define routes

	// Handle OPTIONS requests globally
	// List of allowed origins
	allowedOrigins := map[string]bool{
		"http://localhost:3000":  true,
		"http://localhost:33921": true,
		"http://127.0.0.1:33921": true,
	}

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers for all responses
		origin := r.Header.Get("Origin")
		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Max-Age", "86400") // Cache preflight for 24 hours

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// For non-OPTIONS requests that don't match any other routes
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}

		// For the root path, show a simple response
		w.Write([]byte("Online Judge API Server"))
	})

	// OAuth routes
	http.HandleFunc("/auth/login/", middleware.WithCORS(handlers.OAuthLoginHandler))
	http.HandleFunc("/auth/callback/", middleware.WithCORS(handlers.OAuthCallbackHandler))

	http.HandleFunc("/register", middleware.WithCORS(handlers.RegisterHandler))
	http.HandleFunc("/login", middleware.WithCORS(handlers.LoginHandler))
	http.HandleFunc("/logout", middleware.WithCORS(handlers.LogoutHandler))
	http.HandleFunc("/guest-login", middleware.WithCORS(middleware.IPRateLimitMiddleware(3, 60)(handlers.GuestLoginHandler))) // Rate limit: 3 req/hour
	http.HandleFunc("/autocomplete", middleware.WithCORS(middleware.JWTAuthMiddleware(middleware.RateLimitMiddleware(models.ServiceCodeCompletion)(handlers.AutocompleteHandler))))
	http.HandleFunc("/api/auth-status", middleware.WithCORS(handlers.AuthStatusHandler))
	http.HandleFunc("/problems", middleware.WithCORS(middleware.CacheControlMiddleware(handlers.GetProblemsHandler, 300)))
	http.HandleFunc("/problems/", middleware.WithCORS(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/stats") {
			middleware.CacheControlMiddleware(handlers.GetProblemStatsHandler, 300)(w, r) // Cache problem stats
		} else {
			middleware.CacheControlMiddleware(handlers.GetProblemHandler, 300)(w, r) // Cache individual problem
		}
	}))
	http.HandleFunc("/execute", middleware.WithCORS(middleware.JWTAuthMiddleware(middleware.RateLimitMiddleware(models.ServiceCodeExecution)(handlers.ExecuteCodeHandler))))
	http.HandleFunc("/testcases", middleware.WithCORS(middleware.JWTAuthMiddleware(handlers.AddTestCaseHandler))) // Only for admins

	// New routes for problem creation and test case generation
	http.HandleFunc("/admin/problems", middleware.WithCORS(middleware.JWTAuthMiddleware(handlers.CreateProblemHandler)))
	http.HandleFunc("/api/generate-testcases", middleware.WithCORS(handlers.GenerateTestCasesHandler))
	http.HandleFunc("/api/bulk-add-testcases", middleware.WithCORS(middleware.JWTAuthMiddleware(handlers.BulkAddTestCasesHandler)))
	http.HandleFunc("/api/generate-problem-details", middleware.WithCORS(middleware.JWTAuthMiddleware(handlers.GenerateProblemDetailsHandler)))

	// New routes for generating brute force solutions and expected outputs
	http.HandleFunc("/api/generate-brute-force-solution", middleware.WithCORS(middleware.JWTAuthMiddleware(handlers.GenerateBruteForceSolutionHandler)))
	http.HandleFunc("/api/generate-expected-outputs", middleware.WithCORS(middleware.JWTAuthMiddleware(handlers.GenerateExpectedOutputsHandler)))

	// Profile routes
	http.HandleFunc("/api/users/", middleware.WithCORS(func(w http.ResponseWriter, r *http.Request) {
		pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(pathParts) >= 4 && pathParts[3] == "profile" {
			handlers.GetProfile(w, r)
		} else if len(pathParts) >= 4 && pathParts[3] == "stats" {
			handlers.GetUserStats(w, r)
		} else if len(pathParts) >= 4 && pathParts[3] == "checkins" {
			handlers.GetUserCheckinHistory(w, r)
		} else if len(pathParts) >= 4 && pathParts[3] == "languages" {
			handlers.GetUserLanguages(w, r)
		} else if len(pathParts) >= 4 && pathParts[3] == "skills" {
			handlers.GetUserSkills(w, r)
		} else if len(pathParts) >= 4 && pathParts[3] == "submissions" {
			handlers.GetUserRecentSubmissions(w, r)
		} else if len(pathParts) >= 4 && pathParts[3] == "discussion-count" {
			handlers.GetUserDiscussionCount(w, r)
		} else if len(pathParts) >= 3 {
			// Handle /api/users/{username} endpoint
			handlers.GetUser(w, r)
		} else {
			http.NotFound(w, r)
		}
	}))
	http.HandleFunc("/api/profile", middleware.WithCORS(middleware.JWTAuthMiddleware(handlers.UpdateProfile)))
	http.HandleFunc("/api/checkin", middleware.WithCORS(middleware.JWTAuthMiddleware(handlers.RecordCheckin)))

	// Admin routes for stats
	http.HandleFunc("/api/admin/rankings/update", middleware.WithCORS(middleware.JWTAuthMiddleware(middleware.AdminAuthMiddleware(handlers.UpdateAllRankings))))
	http.HandleFunc("/api/admin/checkins/generate", middleware.WithCORS(middleware.JWTAuthMiddleware(middleware.AdminAuthMiddleware(handlers.AdminGenerateTestCheckins))))
	http.HandleFunc("/api/admin/languages/generate", middleware.WithCORS(middleware.JWTAuthMiddleware(middleware.AdminAuthMiddleware(handlers.AdminGenerateLanguageStats))))
	http.HandleFunc("/api/admin/skills/generate", middleware.WithCORS(middleware.JWTAuthMiddleware(middleware.AdminAuthMiddleware(handlers.AdminGenerateSkillStats))))

	// Rate limit administration routes
	http.HandleFunc("/api/rate-limits", middleware.WithCORS(middleware.JWTAuthMiddleware(handlers.GetUserRateLimitsHandler)))
	http.HandleFunc("/api/admin/rate-limits", middleware.WithCORS(middleware.JWTAuthMiddleware(middleware.AdminAuthMiddleware(handlers.AdminUpdateUserRateLimitsHandler))))

	// Rankings endpoint
	http.HandleFunc("/api/rankings", middleware.WithCORS(handlers.GetRankingsHandler))
	http.HandleFunc("/api/rankings/update", middleware.WithCORS(handlers.ForceUpdateRankings))

	// Submission routes
	http.HandleFunc("/submissions", middleware.WithCORS(handlers.GetSubmissionsHandler))
	http.HandleFunc("/submissions/", middleware.WithCORS(handlers.GetSubmissionDetailsHandler))
	http.HandleFunc("/submit", middleware.WithCORS(middleware.JWTAuthMiddleware(middleware.RateLimitMiddleware(models.ServiceCodeSubmission)(handlers.SubmitSolutionHandler))))
	http.HandleFunc("/convert-code", middleware.WithCORS(middleware.JWTAuthMiddleware(middleware.RateLimitMiddleware(models.ServicePseudocodeToCode)(handlers.ConvertCodeHandler))))
	http.HandleFunc("/api/ai-hint", middleware.WithCORS(middleware.JWTAuthMiddleware(middleware.RateLimitMiddleware(models.ServiceAIHint)(handlers.AIHintHandler))))

	// Last code retrieval route
	http.HandleFunc("/last-code", middleware.WithCORS(middleware.JWTAuthMiddleware(handlers.GetLastCodeHandler)))

	// Discussion routes
	http.HandleFunc("/api/discussions/", middleware.WithCORS(func(w http.ResponseWriter, r *http.Request) {
		pathParts := strings.Split(r.URL.Path, "/")
		if len(pathParts) >= 4 && pathParts[3] == "problems" && len(pathParts) >= 6 && pathParts[5] == "threads" {
			// /api/discussions/problems/{problemId}/threads
			if r.Method == http.MethodGet {
				handlers.GetThreadsHandler(w, r)
			} else if r.Method == http.MethodPost {
				middleware.JWTAuthMiddleware(handlers.CreateThreadHandler)(w, r)
			} else {
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		} else if len(pathParts) >= 4 && pathParts[3] == "threads" && len(pathParts) >= 6 && pathParts[5] == "comments" {
			// /api/discussions/threads/{threadId}/comments
			if r.Method == http.MethodGet {
				handlers.GetCommentsHandler(w, r)
			} else if r.Method == http.MethodPost {
				middleware.JWTAuthMiddleware(handlers.CreateCommentHandler)(w, r)
			} else {
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		} else if len(pathParts) >= 4 && pathParts[3] == "comments" {
			// /api/discussions/comments/{commentId}
			middleware.JWTAuthMiddleware(handlers.DeleteCommentHandler)(w, r)
		} else {
			http.NotFound(w, r)
		}
	}))
	http.HandleFunc("/api/vote", middleware.WithCORS(middleware.JWTAuthMiddleware(handlers.VoteHandler)))

	// Code execution route
	http.HandleFunc("/api/execute", middleware.WithCORS(handlers.ExecuteCodeHandler))
	http.HandleFunc("/api/parser-check", middleware.WithCORS(handlers.ParserCheckHandler))

	// Test endpoint for Python evaluation
	http.HandleFunc("/api/test-python-eval", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			Expressions []string `json:"expressions"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		results := make(map[string]string)
		for i, expr := range req.Expressions {
			results[fmt.Sprintf("expr_%d", i)] = ai.EvaluatePythonExpression(expr)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"results": results,
		})
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server starting on port %s...", port)
	err = http.ListenAndServe(":"+port, nil)
	if err != nil {
		log.Fatal(err)
	}
}
