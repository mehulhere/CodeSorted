package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"backend/internal/ai"
	"backend/internal/database"
	"backend/internal/handlers"
	"backend/internal/middleware"
	"context"

	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatal("Error loading .env file in main.go")
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

	http.HandleFunc("/register", middleware.WithCORS(handlers.RegisterHandler))
	http.HandleFunc("/login", middleware.WithCORS(handlers.LoginHandler))
	http.HandleFunc("/logout", middleware.WithCORS(handlers.LogoutHandler))
	http.HandleFunc("/autocomplete", middleware.WithCORS(middleware.JWTAuthMiddleware(handlers.AutocompleteHandler)))
	http.HandleFunc("/api/auth-status", middleware.WithCORS(handlers.AuthStatusHandler))
	http.HandleFunc("/problems", middleware.WithCORS(handlers.GetProblemsHandler))
	http.HandleFunc("/problems/", middleware.WithCORS(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/stats") {
			handlers.GetProblemStatsHandler(w, r)
		} else {
			handlers.GetProblemHandler(w, r)
		}
	}))
	http.HandleFunc("/execute", middleware.WithCORS(middleware.JWTAuthMiddleware(handlers.ExecuteCodeHandler)))
	http.HandleFunc("/testcases", middleware.WithCORS(middleware.JWTAuthMiddleware(handlers.AddTestCaseHandler))) // Only for admins

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
	http.HandleFunc("/api/admin/rankings/update", middleware.WithCORS(middleware.JWTAuthMiddleware(handlers.UpdateAllRankings)))
	http.HandleFunc("/api/admin/checkins/generate", middleware.WithCORS(middleware.JWTAuthMiddleware(handlers.AdminGenerateTestCheckins)))
	http.HandleFunc("/api/admin/languages/generate", middleware.WithCORS(middleware.JWTAuthMiddleware(handlers.AdminGenerateLanguageStats)))
	http.HandleFunc("/api/admin/skills/generate", middleware.WithCORS(middleware.JWTAuthMiddleware(handlers.AdminGenerateSkillStats)))

	// Rankings endpoint
	http.HandleFunc("/api/rankings", middleware.WithCORS(handlers.GetRankingsHandler))
	http.HandleFunc("/api/rankings/update", middleware.WithCORS(handlers.ForceUpdateRankings))

	// Submission routes
	http.HandleFunc("/submissions", middleware.WithCORS(handlers.GetSubmissionsHandler))
	http.HandleFunc("/submissions/", middleware.WithCORS(handlers.GetSubmissionDetailsHandler))
	http.HandleFunc("/submit", middleware.WithCORS(middleware.JWTAuthMiddleware(handlers.SubmitSolutionHandler)))
	http.HandleFunc("/convert-code", middleware.WithCORS(middleware.JWTAuthMiddleware(handlers.ConvertCodeHandler)))

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
