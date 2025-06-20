package handlers

import (
	"backend/internal/database"
	"backend/internal/models"
	"backend/internal/types"
	"backend/internal/utils"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

var jwtKey []byte

func init() {
	err := godotenv.Load(".env") // Adjust path as needed
	if err != nil {
		fmt.Println("Warning: Error loading .env file in tests. Ensure environment variables are set.")
	}
	secret := os.Getenv("JWT_SECRET_KEY")
	if secret == "" {
		log.Println("CRITICAL: JWT_SECRET_KEY not found in environment variables during init in auth.go.")
		return
	}
	jwtKey = []byte(secret)
}
func isValidEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, "Method not allowed. Only POST is accepted.", http.StatusMethodNotAllowed)
		return
	}

	var payload types.RegisterationPayload
	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		log.Println("Invalid registration request payload:", err)
		utils.SendJSONError(w, "Invalid request payload. Ensure all fields are valid JSON strings.", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if payload.Firstname == "" || payload.Lastname == "" || payload.Username == "" || payload.Password == "" || payload.Email == "" {
		utils.SendJSONError(w, "All fields (firstname, lastname, username, email, password) are required.", http.StatusBadRequest)
		return
	}
	if len(payload.Password) < 8 {
		utils.SendJSONError(w, "Password must be at least 8 characters long.", http.StatusBadRequest)
		return
	}
	if !isValidEmail(payload.Email) {
		utils.SendJSONError(w, "Invalid email address.", http.StatusBadRequest)
		return
	}

	if len(payload.Username) < 3 { // Add to Frontend Validation
		utils.SendJSONError(w, "Username must be at least 3 characters long.", http.StatusBadRequest)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(payload.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Println("Failed to hash password:", err)
		utils.SendJSONError(w, "Failed to complete password hashing.", http.StatusInternalServerError)
		return
	}

	newUser := models.User{
		Firstname: payload.Firstname,
		Lastname:  payload.Lastname,
		Username:  payload.Username,
		Email:     payload.Email,
		Password:  string(hashedPassword),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	usersCollection := database.GetCollection("OJ", "users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := usersCollection.InsertOne(ctx, newUser)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			utils.SendJSONError(w, "Username or email already exists.", http.StatusConflict)
			return
		}
		log.Printf("Failed to register user in DB: %v\n", err)
		utils.SendJSONError(w, fmt.Sprintf("Failed to register user: %v", err), http.StatusInternalServerError)
		return
	}

	var userIDHex string
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		userIDHex = oid.Hex()
	} else {
		log.Println("Failed to retrieve generated user ID for token. InsertedID was not an ObjectID.")
		utils.SendJSONError(w, "Failed to retrieve generated user ID for token.", http.StatusInternalServerError)
		return
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &types.Claims{
		UserID:    userIDHex,
		Username:  newUser.Username,
		Email:     newUser.Email,
		Firstname: newUser.Firstname,
		Lastname:  newUser.Lastname,
		IsAdmin:   newUser.IsAdmin,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		log.Printf("Failed to sign JWT token: %v\n", err)
		utils.SendJSONError(w, "User registered, but server configuration error prevented token generation.", http.StatusInternalServerError)
		return
	}

	// Set the JWT as an HTTP-only cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "authToken", // Name of the cookie
		Value:    tokenString, // The JWT token string
		Expires:  expirationTime,
		HttpOnly: true,                  // Make it HTTP-only
		Secure:   true,                  // Make it Secure
		SameSite: http.SameSiteNoneMode, // Recommended for CSRF protection
		Path:     "/",                   // Make the cookie available to all paths
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)

	// Send a success message with user data
	response := map[string]interface{}{
		"message":    "User Registered Successfully",
		"isLoggedIn": true,
		"expiresAt":  expirationTime.Unix(),
		"user": map[string]interface{}{
			"id":        userIDHex,
			"username":  newUser.Username,
			"email":     newUser.Email,
			"firstname": newUser.Firstname,
			"lastname":  newUser.Lastname,
			"isAdmin":   newUser.IsAdmin,
		},
	}
	json.NewEncoder(w).Encode(response)
	log.Printf("User registered: %s (Firstname: %s, Lastname: %s, Email: %s, UserID: %s)\n", newUser.Username, newUser.Firstname, newUser.Lastname, newUser.Email, userIDHex)
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, "Method not allowed. Only POST is accepted.", http.StatusMethodNotAllowed)
		return
	}

	var payload types.LoginPayload
	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		log.Println("Invalid login request payload:", err)
		utils.SendJSONError(w, "Invalid request payload. Ensure email and password are provided as valid JSON strings.", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if payload.Email == "" || payload.Password == "" {
		utils.SendJSONError(w, "Username/Email and password are required.", http.StatusBadRequest)
		return
	}

	usersCollection := database.GetCollection("OJ", "users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var foundUser models.User

	// Determine if the input is likely an email or a username
	// A simple check for '@' is used here, but a more robust validation (like isValidEmail) could be used.
	isEmail := strings.Contains(payload.Email, "@")

	var filter primitive.M
	if isEmail {
		filter = primitive.M{"email": payload.Email}
		err = usersCollection.FindOne(ctx, filter).Decode(&foundUser)
		if err == mongo.ErrNoDocuments {
			// Not found by email, now try by username
			filter = primitive.M{"username": payload.Email}
			err = usersCollection.FindOne(ctx, filter).Decode(&foundUser)
		}
	} else {
		// Not an email, search by username
		filter = primitive.M{"username": payload.Email}
		err = usersCollection.FindOne(ctx, filter).Decode(&foundUser)
	}
	if err == mongo.ErrNoDocuments {
		utils.SendJSONError(w, "Invalid username/email or password.", http.StatusUnauthorized)
		return
	} else if err != nil {
		log.Printf("Database error during login: %v\n", err)
		utils.SendJSONError(w, "Internal server error during login.", http.StatusInternalServerError)
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(foundUser.Password), []byte(payload.Password))
	if err != nil {
		utils.SendJSONError(w, "Invalid username/email or password.", http.StatusUnauthorized)
		return
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &types.Claims{
		UserID:    foundUser.ID.Hex(),
		Username:  foundUser.Username,
		Email:     foundUser.Email,
		Firstname: foundUser.Firstname,
		Lastname:  foundUser.Lastname,
		IsAdmin:   foundUser.IsAdmin,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		log.Printf("Failed to sign JWT token: %v\n", err)
		utils.SendJSONError(w, "Server configuration error prevented token generation.", http.StatusInternalServerError)
		return
	}

	// Set the JWT as an HTTP-only cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "authToken", // Name of the cookie
		Value:    tokenString, // The JWT token string
		Expires:  expirationTime,
		HttpOnly: true,                  // Make it HTTP-only
		Secure:   true,                  // Make it Secure
		SameSite: http.SameSiteNoneMode, // Recommended for CSRF protection
		Path:     "/",                   // Make the cookie available to all paths
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	// Send a success message with user data
	response := map[string]interface{}{
		"message":    "Login Successful",
		"isLoggedIn": true,
		"expiresAt":  expirationTime.Unix(),
		"user": map[string]interface{}{
			"id":        foundUser.ID.Hex(),
			"username":  foundUser.Username,
			"email":     foundUser.Email,
			"firstname": foundUser.Firstname,
			"lastname":  foundUser.Lastname,
			"isAdmin":   foundUser.IsAdmin,
		},
	}
	json.NewEncoder(w).Encode(response)
	log.Printf("User logged in: %s (Email: %s)\n", foundUser.Username, foundUser.Email)
}

func AuthStatusHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("authToken")
	// If no cookie, the user is not logged in
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK) // OK status, not an error
		json.NewEncoder(w).Encode(map[string]interface{}{"isLoggedIn": false})
		return
	}

	tokenStr := cookie.Value
	claims := &types.Claims{}

	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})

	// If token is invalid or expired
	if err != nil || !token.Valid {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK) // OK status, not an error
		json.NewEncoder(w).Encode(map[string]interface{}{"isLoggedIn": false})
		return
	}

	// Token is valid, so user is logged in
	response := map[string]interface{}{
		"isLoggedIn": true,
		"user": map[string]interface{}{
			"id":        claims.UserID,
			"username":  claims.Username,
			"email":     claims.Email,
			"firstname": claims.Firstname,
			"lastname":  claims.Lastname,
			"isAdmin":   claims.IsAdmin,
		},
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	// Allow POST (for action) and OPTIONS (for CORS)
	if r.Method != http.MethodPost && r.Method != http.MethodOptions {
		utils.SendJSONError(w, "Method not allowed. Only POST is accepted.", http.StatusMethodNotAllowed)
		return
	}

	// For OPTIONS requests, just return OK
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Create an expired cookie with the same attributes as the login cookie
	// Important: Use the exact same settings (Path, Domain, Secure, HttpOnly, SameSite)
	// that were used when creating the cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "authToken",
		Value:    "",                              // Empty value
		Expires:  time.Now().Add(-24 * time.Hour), // Set to past time
		MaxAge:   -1,                              // Immediate expiration
		HttpOnly: true,                            // Same as login
		Secure:   true,                            // Make it Secure
		SameSite: http.SameSiteNoneMode,           // Same as login
		Path:     "/",                             // Same as login
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Logged out successfully"})

	log.Println("User logged out successfully")
}

// GuestLoginHandler creates a temporary guest account and logs the user in
func GuestLoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendJSONError(w, "Method not allowed. Only POST is accepted.", http.StatusMethodNotAllowed)
		return
	}

	// Generate a random guest username and default password
	rand.Seed(time.Now().UnixNano())
	guestNumber := rand.Intn(1000000)
	username := fmt.Sprintf("guest_%06d", guestNumber)
	password := fmt.Sprintf("guest_%06d_pwd", guestNumber)
	email := fmt.Sprintf("guest_%06d@example.com", guestNumber)

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Println("Failed to hash password for guest account:", err)
		utils.SendJSONError(w, "Failed to create guest account.", http.StatusInternalServerError)
		return
	}

	// Create a new guest user
	newUser := models.User{
		Firstname: "Guest",
		Lastname:  "User",
		Username:  username,
		Email:     email,
		Password:  string(hashedPassword),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Save to database
	usersCollection := database.GetCollection("OJ", "users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := usersCollection.InsertOne(ctx, newUser)
	if err != nil {
		log.Printf("Failed to create guest user in DB: %v\n", err)
		utils.SendJSONError(w, fmt.Sprintf("Failed to create guest account: %v", err), http.StatusInternalServerError)
		return
	}

	var userIDHex string
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		userIDHex = oid.Hex()
	} else {
		log.Println("Failed to retrieve generated user ID for guest token")
		utils.SendJSONError(w, "Failed to create guest account", http.StatusInternalServerError)
		return
	}

	// Create a JWT token for the guest user
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &types.Claims{
		UserID:    userIDHex,
		Username:  newUser.Username,
		Email:     newUser.Email,
		Firstname: newUser.Firstname,
		Lastname:  newUser.Lastname,
		IsAdmin:   false,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		log.Printf("Failed to sign JWT token for guest: %v\n", err)
		utils.SendJSONError(w, "Guest account created, but server configuration error prevented token generation.", http.StatusInternalServerError)
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

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)

	// Send a success message with user data
	response := map[string]interface{}{
		"message":    "Guest Login Successful",
		"isLoggedIn": true,
		"expiresAt":  expirationTime.Unix(),
		"user": map[string]interface{}{
			"id":        userIDHex,
			"username":  newUser.Username,
			"email":     newUser.Email,
			"firstname": newUser.Firstname,
			"lastname":  newUser.Lastname,
			"isAdmin":   false,
		},
	}

	json.NewEncoder(w).Encode(response)
	log.Printf("Guest user created and logged in: %s (ID: %s)\n", newUser.Username, userIDHex)
}
