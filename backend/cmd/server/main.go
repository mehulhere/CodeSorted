package main

import (
	"backend/internal/database"
	"backend/internal/models"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"regexp"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

type Claims struct {
	UserID    string `json:"user_id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	Firstname string `json:"firstname"`
	Lastname  string `json:"lastname"`
	jwt.RegisteredClaims
}

type RegisterationPayload struct {
	Firstname string `json:"firstname"`
	Lastname  string `json:"lastname"`
	Email     string `json:"email"`
	Username  string `json:"username"`
	Password  string `json:"password"`
}

// Add a new type for the login payload
type LoginPayload struct {
	Email    string `json:"email"` // Or Username, depending on what you want to use for login
	Password string `json:"password"`
}

var jwtKey []byte

func helloHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Hello, World!")
}

func greetHandler(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		name = "Guest"
	}
	fmt.Fprintf(w, "Hello, %s!", name)
}

func isValidEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

func registerHandler(w http.ResponseWriter, r *http.Request) {

	// Enfore POST method
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get the username and password from the request
	var payload RegisterationPayload

	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		log.Println("Invalid request payload", err)
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	defer r.Body.Close()

	// Validate the input
	if payload.Firstname == "" || payload.Lastname == "" || payload.Username == "" || payload.Password == "" || payload.Email == "" {
		http.Error(w, "All fields are required", http.StatusBadRequest)
		return
	}

	if len(payload.Password) < 8 {
		http.Error(w, "Password must be at least 8 characters long", http.StatusBadRequest)
		return
	}

	if !isValidEmail(payload.Email) {
		http.Error(w, "Invalid email address", http.StatusBadRequest)
		return
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(payload.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to complete password hasing", http.StatusInternalServerError)
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

	// Get the collection
	usersCollection := database.GetCollection("OJ", "users")

	// Insert the user
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := usersCollection.InsertOne(ctx, newUser)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			http.Error(w, "Username already exists", http.StatusConflict)
			return
		}
		http.Error(w, fmt.Sprintf("Failed to register user: %v", err), http.StatusInternalServerError)
		return
	}

	var userIDHex string
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		userIDHex = oid.Hex()
	} else {
		http.Error(w, "Failed to retrieve generated user ID for token", http.StatusInternalServerError)
		return
	}

	// Access the key from env
	secret := os.Getenv("JWT_SECRET_KEY")
	if secret == "" {
		log.Fatal("FATAL: JWT_SECRET_KEY not found")
	}

	// JWT Generation
	expirationTime := time.Now().Add(24 * time.Hour) // Token will expire after 24 hours

	claims := &Claims{
		UserID:    userIDHex,
		Username:  newUser.Username,
		Email:     newUser.Email,
		Firstname: newUser.Firstname,
		Lastname:  newUser.Lastname,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	jwtKey = []byte(secret)

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		http.Error(w, "User registered, but failed to generate token", http.StatusInternalServerError)
		return
	}

	// Return User Registered Successfully
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	response := map[string]interface{}{
		"message":    "User Registered Successfully",
		"insertedID": userIDHex,
		"token":      tokenString,
	}
	json.NewEncoder(w).Encode(response)
	log.Printf("User registered: %s (Firstname: %s, Lastname: %s, Email: %s, UserID: %s)\n", newUser.Username, newUser.Firstname, newUser.Lastname, newUser.Email, userIDHex)
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	// Enforce POST method
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed. Only POST is accepted.", http.StatusMethodNotAllowed)
		return
	}

	var payload LoginPayload
	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		log.Println("Invalid login request payload:", err)
		http.Error(w, "Invalid request payload. Ensure email/username and password are provided as strings.", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate input
	if payload.Email == "" || payload.Password == "" { // Or payload.Username
		http.Error(w, "Email/username and password are required.", http.StatusBadRequest)
		return
	}

	// Get the users collection
	usersCollection := database.GetCollection("OJ", "users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Find the user by email (or username)
	var foundUser models.User // Assuming models.User has Email, Username, Password, ID fields
	// If using email to login:
	err = usersCollection.FindOne(ctx, primitive.M{"email": payload.Email}).Decode(&foundUser)
	// If you want to allow login with username instead, change to:
	// err = usersCollection.FindOne(ctx, bson.M{"username": payload.Username}).Decode(&user)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			http.Error(w, "Invalid email/username or password.", http.StatusUnauthorized) // Generic error for security
			return
		}
		log.Println("Error finding user:", err)
		http.Error(w, "Failed to process login.", http.StatusInternalServerError)
		return
	}

	// Compare the provided password with the stored hashed password
	err = bcrypt.CompareHashAndPassword([]byte(foundUser.Password), []byte(payload.Password))
	if err != nil {
		// If passwords don't match, bcrypt returns an error
		http.Error(w, "Invalid email/username or password.", http.StatusUnauthorized) // Generic error
		return
	}

	// --- Passwords match, generate JWT ---
	secret := os.Getenv("JWT_SECRET_KEY")
	if secret == "" {
		log.Println("CRITICAL: JWT_SECRET_KEY not found in environment variables during login.")
		http.Error(w, "Login successful, but server configuration error prevented token generation.", http.StatusInternalServerError)
		return
	}
	jwtKey = []byte(secret) // Assuming jwtKey is a global var as in registerHandler

	expirationTime := time.Now().Add(24 * time.Hour) // Token expires in 24 hours
	claims := &Claims{
		UserID:    foundUser.ID.Hex(), // Assuming your models.User has an ID field of type primitive.ObjectID
		Username:  foundUser.Username,
		Email:     foundUser.Email,
		Firstname: foundUser.Firstname,
		Lastname:  foundUser.Lastname,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		log.Println("Failed to sign JWT token during login:", err)
		http.Error(w, "Login successful, but failed to generate token.", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	response := map[string]interface{}{
		"message": "Login Successful",
		"token":   tokenString,
		"user": map[string]string{ // Optionally send some non-sensitive user info
			"user_id":   foundUser.ID.Hex(),
			"username":  foundUser.Username,
			"email":     foundUser.Email,
			"firstname": foundUser.Firstname,
			"lastname":  foundUser.Lastname,
		},
	}
	json.NewEncoder(w).Encode(response)
	log.Println("User logged in:", foundUser.Username)
}

func withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000, http://localhost:3001")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		if r.Method == "OPTIONS" { // Handle preflight requests
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	}
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: Error loading .env file")
	}

	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		log.Fatal("Warning: MONGO_URI not initialized")
	}

	err_db := database.ConnectDB(mongoURI)
	if err_db != nil {
		log.Fatalf("Could not connect to the database: %v", err_db)
	}
	log.Println("Succesfuuily connected to MongoDB")
	defer database.DisconnectDB()

	http.HandleFunc("/register", withCORS(registerHandler))
	http.HandleFunc("/login", withCORS(loginHandler))
	http.HandleFunc("/", withCORS(helloHandler))
	http.HandleFunc("/greet", withCORS(greetHandler))

	log.Println("Server listening on port 8080. Allowed origin for CORS: http://localhost:3000")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
