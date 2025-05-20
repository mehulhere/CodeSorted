package main

import (
	"backend/internal/database"
	"backend/internal/models"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

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

	// Return User Registered Successfully
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	response := map[string]interface{}{
		"message":    "User Registered Successfully",
		"insertedID": result.InsertedID,
	}
	json.NewEncoder(w).Encode(response)
	fmt.Fprintf(w, "User registered: %s (Firstname: %s, Lastname: %s)", username, firstname, lastname)
}

func main() {
	http.HandleFunc("/", helloHandler)
	http.HandleFunc("/greet", greetHandler)
	http.HandleFunc("/register", registerHandler)

	fmt.Println("Server listening on port 8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
