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
	Firstname string `json:"firstname"`
	Lastname  string `json:"lastname"`
	jwt.RegisteredClaims
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

func registerHandler(w http.ResponseWriter, r *http.Request) {
	// Get the username and password from the request
	firstname := r.URL.Query().Get("firstname")
	lastname := r.URL.Query().Get("lastname")
	username := r.URL.Query().Get("username")
	password := r.URL.Query().Get("password")

	// Validate the input
	if firstname == "" || lastname == "" || username == "" || password == "" {
		http.Error(w, "All fields are required", http.StatusBadRequest)
		return
	}

	if len(password) < 8 {
		http.Error(w, "Password must be at least 8 characters long", http.StatusBadRequest)
		return
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to complete password hasing", http.StatusInternalServerError)
		return
	}

	newUser := models.User{
		Firstname: firstname,
		Lastname:  lastname,
		Username:  username,
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

	// Using UserId as unique id instead of email for faster lookups
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

	payload := &Claims{
		UserID:    userIDHex,
		Username:  newUser.Username,
		Firstname: newUser.Firstname,
		Lastname:  newUser.Lastname,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	jwtKey = []byte(secret)

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, payload)
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
		"insertedID": result.InsertedID,
		"token":      tokenString,
	}
	json.NewEncoder(w).Encode(response)
	fmt.Fprintf(w, "User registered: %s (Firstname: %s, Lastname: %s)", username, firstname, lastname)
	fmt.Println("User registered: ", username, "(Firstname: ", firstname, ", Lastname: ", lastname, ")")
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

	http.HandleFunc("/", helloHandler)
	http.HandleFunc("/greet", greetHandler)
	http.HandleFunc("/register", registerHandler)

	fmt.Println("Server listening on port 8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
