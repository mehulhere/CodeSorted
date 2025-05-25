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

// Helper function to send JSON errors
func sendJSONError(w http.ResponseWriter, message string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]string{"message": message})
}

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
	if r.Method != http.MethodPost {
		sendJSONError(w, "Method not allowed. Only POST is accepted.", http.StatusMethodNotAllowed)
		return
	}

	var payload RegisterationPayload
	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		log.Println("Invalid registration request payload:", err)
		sendJSONError(w, "Invalid request payload. Ensure all fields are valid JSON strings.", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if payload.Firstname == "" || payload.Lastname == "" || payload.Username == "" || payload.Password == "" || payload.Email == "" {
		sendJSONError(w, "All fields (firstname, lastname, username, email, password) are required.", http.StatusBadRequest)
		return
	}
	if len(payload.Password) < 8 {
		sendJSONError(w, "Password must be at least 8 characters long.", http.StatusBadRequest)
		return
	}
	if !isValidEmail(payload.Email) {
		sendJSONError(w, "Invalid email address.", http.StatusBadRequest)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(payload.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Println("Failed to hash password:", err)
		sendJSONError(w, "Failed to complete password hashing.", http.StatusInternalServerError)
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
			sendJSONError(w, "Username or email already exists.", http.StatusConflict)
			return
		}
		log.Printf("Failed to register user in DB: %v\n", err)
		sendJSONError(w, fmt.Sprintf("Failed to register user: %v", err), http.StatusInternalServerError)
		return
	}

	var userIDHex string
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		userIDHex = oid.Hex()
	} else {
		log.Println("Failed to retrieve generated user ID for token. InsertedID was not an ObjectID.")
		sendJSONError(w, "Failed to retrieve generated user ID for token.", http.StatusInternalServerError)
		return
	}

	secret := os.Getenv("JWT_SECRET_KEY")
	if secret == "" {
		log.Println("CRITICAL: JWT_SECRET_KEY not found in environment variables.")
		sendJSONError(w, "User registered, but server configuration error prevented token generation.", http.StatusInternalServerError)
		return
	}
	jwtKey = []byte(secret)

	expirationTime := time.Now().Add(24 * time.Hour)
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

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		log.Printf("Failed to sign JWT token: %v\n", err)
		sendJSONError(w, "User registered, but failed to generate token.", http.StatusInternalServerError)
		return
	}

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
	if r.Method != http.MethodPost {
		sendJSONError(w, "Method not allowed. Only POST is accepted.", http.StatusMethodNotAllowed)
		return
	}

	var payload LoginPayload
	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		log.Println("Invalid login request payload:", err)
		sendJSONError(w, "Invalid request payload. Ensure email and password are provided as valid JSON strings.", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if payload.Email == "" || payload.Password == "" {
		sendJSONError(w, "Email and password are required.", http.StatusBadRequest)
		return
	}

	usersCollection := database.GetCollection("OJ", "users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var foundUser models.User
	err = usersCollection.FindOne(ctx, primitive.M{"email": payload.Email}).Decode(&foundUser)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			sendJSONError(w, "Invalid email or password.", http.StatusUnauthorized)
			return
		}
		log.Println("Error finding user:", err)
		sendJSONError(w, "Failed to process login due to a server error.", http.StatusInternalServerError)
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(foundUser.Password), []byte(payload.Password))
	if err != nil {
		sendJSONError(w, "Invalid email or password.", http.StatusUnauthorized)
		return
	}

	secret := os.Getenv("JWT_SECRET_KEY")
	if secret == "" {
		log.Println("CRITICAL: JWT_SECRET_KEY not found in environment variables during login.")
		sendJSONError(w, "Login successful, but server configuration error prevented token generation.", http.StatusInternalServerError)
		return
	}
	jwtKey = []byte(secret)

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID:    foundUser.ID.Hex(),
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
		sendJSONError(w, "Login successful, but failed to generate token.", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	response := map[string]interface{}{
		"message": "Login Successful",
		"token":   tokenString,
		"user": map[string]string{
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

func getProblemsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendJSONError(w, "Method not allowed. Only GET is accepted.", http.StatusMethodNotAllowed)
		return
	}

	problemsCollection := database.GetCollection("OJ", "problems")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := problemsCollection.Find(ctx, primitive.M{})
	if err != nil {
		log.Println("Error fetching problems from DB:", err)
		sendJSONError(w, "Failed to retrieve problems.", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	var problems []models.ProblemListItem
	for cursor.Next(ctx) {
		var problem models.Problem
		if err := cursor.Decode(&problem); err != nil {
			log.Println("Error decoding problem:", err)
			continue
		}
		problems = append(problems, models.ProblemListItem{
			ID:         problem.ID,
			ProblemID:  problem.ProblemID,
			Title:      problem.Title,
			Difficulty: problem.Difficulty,
		})
	}

	if err := cursor.Err(); err != nil {
		log.Println("Error with problems cursor:", err)
		sendJSONError(w, "Error processing problems list.", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(problems); err != nil {
		log.Println("Error encoding problems to JSON:", err)
		// If headers are already written, this specific sendJSONError might not be effective.
		// Consider more centralized error handling for such cases.
	}
	log.Println("Successfully retrieved problems list. Count:", len(problems))
}

func addTestCaseHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendJSONError(w, "Method not allowed. Only POST is accepted.", http.StatusMethodNotAllowed)
		return
	}

	var payload models.AddTestCasePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		log.Println("Invalid add test case request payload:", err)
		sendJSONError(w, "Invalid request payload for test case.", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Validate input (Points and SequenceNumber might have defaults if not provided, or be required)
	if payload.ProblemDBID == "" || payload.Input == "" {
		sendJSONError(w, "ProblemDBID and Input are required for a test case.", http.StatusBadRequest)
		return
	}
	// You might want to add validation for payload.Points and payload.SequenceNumber (e.g., >= 0)

	problemObjectID, err := primitive.ObjectIDFromHex(payload.ProblemDBID)
	if err != nil {
		sendJSONError(w, "Invalid ProblemDBID format. Must be a valid ObjectID hex string.", http.StatusBadRequest)
		return
	}

	problemsCollection := database.GetCollection("OJ", "problems")
	ctxCheck, cancelCheck := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelCheck()
	var existingProblem models.Problem
	err = problemsCollection.FindOne(ctxCheck, primitive.M{"_id": problemObjectID}).Decode(&existingProblem)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			sendJSONError(w, "Problem with the given ProblemDBID not found.", http.StatusNotFound)
			return
		}
		log.Println("Error checking for existing problem:", err)
		sendJSONError(w, "Error verifying problem existence.", http.StatusInternalServerError)
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
		sendJSONError(w, "Failed to add test case.", http.StatusInternalServerError)
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

func withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	}
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: Error loading .env file. Ensure environment variables are set if .env is not used.")
	}

	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		log.Fatal("FATAL: MONGO_URI not found in environment variables.")
	}
	jwtSecret := os.Getenv("JWT_SECRET_KEY")
	if jwtSecret == "" {
		log.Fatal("FATAL: JWT_SECRET_KEY not found in environment variables.")
	}

	err_db := database.ConnectDB(mongoURI)
	if err_db != nil {
		log.Fatalf("Could not connect to the database: %v", err_db)
	}
	log.Println("Successfully connected to MongoDB.")
	defer database.DisconnectDB()

	http.HandleFunc("/register", withCORS(registerHandler))
	http.HandleFunc("/login", withCORS(loginHandler))
	http.HandleFunc("/problems", withCORS(getProblemsHandler))
	http.HandleFunc("/testcases", withCORS(addTestCaseHandler))
	http.HandleFunc("/", withCORS(helloHandler))
	http.HandleFunc("/greet", withCORS(greetHandler))

	log.Println("Server listening on port 8080. Allowed origin for CORS: http://localhost:3000")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
