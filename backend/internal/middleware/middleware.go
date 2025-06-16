package middleware

import (
	"context"
	"log"
	"net/http"
	"os"

	"backend/internal/types"
	"backend/internal/utils"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var jwtKey []byte

func init() {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("WARNING: Error loading .env file in middleware.go.")
	}
	secret := os.Getenv("JWT_SECRET_KEY")
	if secret == "" {
		log.Println("CRITICAL: JWT_SECRET_KEY not found in environment variables during init in middleware.go.")
		return
	}
	jwtKey = []byte(secret)
}

// List of allowed origins
var allowedOrigins = map[string]bool{
	"http://localhost:3000":  true,
	"http://localhost:33921": true,
	"http://127.0.0.1:33921": true,
}

// This is the middleware for the CORS
func WithCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers for all responses
		origin := r.Header.Get("Origin")
		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Max-Age", "86400") // Cache preflight for 24 hours

		// Handle preflight OPTIONS requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Continue with the actual request
		next.ServeHTTP(w, r)
	}
}

// JWTAuthMiddleware checks for a valid JWT token in the request cookie
func JWTAuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get the authToken cookie
		cookie, err := r.Cookie("authToken")
		if err != nil {
			if err == http.ErrNoCookie {
				utils.SendJSONError(w, "Authentication required. Please log in.", http.StatusUnauthorized)
				return
			}
			utils.SendJSONError(w, "Error reading authentication token.", http.StatusBadRequest)
			return
		}

		// Get the JWT string from the cookie
		tokenStr := cookie.Value

		// Initialize a new instance of `Claims`
		claims := &types.Claims{}

		// Parse the JWT string
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})
		if err != nil {
			if err == jwt.ErrSignatureInvalid {
				utils.SendJSONError(w, "Invalid authentication token signature.", http.StatusUnauthorized)
				return
			}
			utils.SendJSONError(w, "Error parsing authentication token.", http.StatusBadRequest)
			return
		}
		if !token.Valid {
			utils.SendJSONError(w, "Invalid authentication token.", http.StatusUnauthorized)
			return
		}

		// Convert the user ID string to ObjectID
		userID, err := primitive.ObjectIDFromHex(claims.UserID)
		if err != nil {
			utils.SendJSONError(w, "Invalid user ID in token.", http.StatusBadRequest)
			return
		}

		// Add userID to the request context
		ctx := context.WithValue(r.Context(), "userID", userID)

		// Token is valid, call the next handler with the modified context
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

// AdminAuthMiddleware checks if the user is authenticated and is an admin
func AdminAuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get the authToken cookie
		cookie, err := r.Cookie("authToken")
		if err != nil {
			if err == http.ErrNoCookie {
				utils.SendJSONError(w, "Authentication required. Please log in.", http.StatusUnauthorized)
				return
			}
			utils.SendJSONError(w, "Error reading authentication token.", http.StatusBadRequest)
			return
		}

		// Get the JWT string from the cookie
		tokenStr := cookie.Value

		// Initialize a new instance of `Claims`
		claims := &types.Claims{}

		// Parse the JWT string
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})
		if err != nil {
			if err == jwt.ErrSignatureInvalid {
				utils.SendJSONError(w, "Invalid authentication token signature.", http.StatusUnauthorized)
				return
			}
			utils.SendJSONError(w, "Error parsing authentication token.", http.StatusBadRequest)
			return
		}
		if !token.Valid {
			utils.SendJSONError(w, "Invalid authentication token.", http.StatusUnauthorized)
			return
		}

		// Check if the user is an admin
		if !claims.IsAdmin {
			utils.SendJSONError(w, "Access denied. Admin privileges required.", http.StatusForbidden)
			return
		}

		// Add claims to the request context
		ctx := context.WithValue(r.Context(), "claims", claims)

		// Token is valid and user is admin, call the next handler
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}
