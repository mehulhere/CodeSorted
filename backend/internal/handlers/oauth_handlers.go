package handlers

import (
	"backend/internal/auth"
	"backend/internal/database"
	"backend/internal/models"
	"backend/internal/types"
	"backend/internal/utils"
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

// OAuthLoginHandler initiates the OAuth flow for a specific provider
func OAuthLoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendJSONError(w, "Method not allowed. Only GET is accepted.", http.StatusMethodNotAllowed)
		return
	}

	// Extract provider name from URL path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 3 {
		utils.SendJSONError(w, "Invalid OAuth provider path", http.StatusBadRequest)
		return
	}
	providerName := pathParts[len(pathParts)-1]

	// Get the provider
	provider := auth.GetProvider(providerName)
	if provider == nil {
		utils.SendJSONError(w, fmt.Sprintf("OAuth provider '%s' not supported", providerName), http.StatusBadRequest)
		return
	}

	// Generate a state token to prevent CSRF
	state, err := auth.GenerateState()
	if err != nil {
		log.Println("Failed to generate state token:", err)
		utils.SendJSONError(w, "Failed to initiate OAuth flow", http.StatusInternalServerError)
		return
	}

	// Store state in a cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
		Path:     "/",
		MaxAge:   int(time.Hour.Seconds()),
	})

	// Redirect to provider's auth page
	authURL := provider.GetAuthURL(state)
	http.Redirect(w, r, authURL, http.StatusFound)
}

// OAuthCallbackHandler handles the OAuth callback from providers
func OAuthCallbackHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendJSONError(w, "Method not allowed. Only GET is accepted.", http.StatusMethodNotAllowed)
		return
	}

	// Extract provider name from URL path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		utils.SendJSONError(w, "Invalid OAuth callback path", http.StatusBadRequest)
		return
	}
	providerName := pathParts[len(pathParts)-1]

	// Get the provider
	provider := auth.GetProvider(providerName)
	if provider == nil {
		utils.SendJSONError(w, fmt.Sprintf("OAuth provider '%s' not supported", providerName), http.StatusBadRequest)
		return
	}

	// Verify state to prevent CSRF
	stateCookie, err := r.Cookie("oauth_state")
	if err != nil {
		utils.SendJSONError(w, "Missing state cookie", http.StatusBadRequest)
		return
	}
	state := r.URL.Query().Get("state")
	if state == "" || state != stateCookie.Value {
		utils.SendJSONError(w, "Invalid state parameter", http.StatusBadRequest)
		return
	}

	// Clear state cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    "",
		HttpOnly: true,
		Secure:   true,
		Path:     "/",
		MaxAge:   -1,
	})

	// Get authorization code from query
	code := r.URL.Query().Get("code")
	if code == "" {
		error := r.URL.Query().Get("error")
		errorDescription := r.URL.Query().Get("error_description")
		if error != "" {
			utils.SendJSONError(w, fmt.Sprintf("OAuth error: %s - %s", error, errorDescription), http.StatusBadRequest)
		} else {
			utils.SendJSONError(w, "Missing authorization code", http.StatusBadRequest)
		}
		return
	}

	// Exchange code for user info
	userInfo, err := provider.GetUserInfo(code)
	if err != nil {
		log.Printf("Failed to get user info from %s: %v", providerName, err)
		utils.SendJSONError(w, fmt.Sprintf("Failed to authenticate with %s", providerName), http.StatusInternalServerError)
		return
	}

	// Check if the user exists, create if not
	user, err := findOrCreateUser(userInfo)
	if err != nil {
		log.Printf("Failed to find or create user: %v", err)
		utils.SendJSONError(w, "Failed to process authentication", http.StatusInternalServerError)
		return
	}

	// Generate JWT token
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &types.Claims{
		UserID:    user.ID.Hex(),
		Username:  user.Username,
		Email:     user.Email,
		Firstname: user.Firstname,
		Lastname:  user.Lastname,
		IsAdmin:   user.IsAdmin,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		log.Printf("Failed to sign JWT token: %v", err)
		utils.SendJSONError(w, "Server configuration error prevented token generation", http.StatusInternalServerError)
		return
	}

	// Set the JWT as an HTTP-only cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "authToken",
		Value:    tokenString,
		Expires:  expirationTime,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
		Path:     "/",
	})

	// Redirect to frontend
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}
	http.Redirect(w, r, frontendURL, http.StatusFound)
}

// findOrCreateUser looks up a user by email and provider ID, or creates a new one
func findOrCreateUser(userInfo *auth.UserInfo) (*models.User, error) {
	usersCollection := database.GetCollection("OJ", "users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Try to find user by email
	var user models.User
	err := usersCollection.FindOne(ctx, bson.M{"email": userInfo.Email}).Decode(&user)
	if err == nil {
		// User found, update OAuth information if needed
		update := bson.M{"$set": bson.M{
			"oauth_provider":  userInfo.Provider,
			"oauth_id":        userInfo.ID,
			"profile_picture": userInfo.Picture,
			"updated_at":      time.Now(),
		}}

		_, updateErr := usersCollection.UpdateOne(ctx, bson.M{"_id": user.ID}, update)
		if updateErr != nil {
			log.Printf("Failed to update OAuth info for user %s: %v", user.Email, updateErr)
		}

		return &user, nil
	}

	if err != mongo.ErrNoDocuments {
		return nil, err
	}

	// User not found, create a new one
	// Generate a random password for OAuth users
	randomPassword, err := generateRandomPassword()
	if err != nil {
		return nil, err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(randomPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Generate a username from email if not provided
	username := generateUsernameFromEmail(userInfo.Email)

	// Create new user
	newUser := models.User{
		Firstname:      userInfo.FirstName,
		Lastname:       userInfo.LastName,
		Username:       username,
		Email:          userInfo.Email,
		Password:       string(hashedPassword),
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
		OAuthProvider:  userInfo.Provider,
		OAuthID:        userInfo.ID,
		ProfilePicture: userInfo.Picture,
	}

	result, err := usersCollection.InsertOne(ctx, newUser)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			// Try with a different username if there's a conflict
			newUser.Username = generateUniqueUsername(username)
			result, err = usersCollection.InsertOne(ctx, newUser)
			if err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}

	// Get the inserted ID
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		newUser.ID = oid
	}

	return &newUser, nil
}

// generateRandomPassword creates a random password for OAuth users
func generateRandomPassword() (string, error) {
	const length = 16
	state, err := auth.GenerateState()
	if err != nil {
		return "", err
	}
	if len(state) > length {
		return state[:length], nil
	}
	return state, nil
}

// generateUsernameFromEmail creates a username from an email address
func generateUsernameFromEmail(email string) string {
	parts := strings.Split(email, "@")
	username := parts[0]

	// Remove special characters
	username = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '.' {
			return r
		}
		return '_'
	}, username)

	return username
}

// generateUniqueUsername adds a random suffix to make a username unique
func generateUniqueUsername(baseUsername string) string {
	timestamp := time.Now().UnixNano() % 10000
	return fmt.Sprintf("%s_%d", baseUsername, timestamp)
}
