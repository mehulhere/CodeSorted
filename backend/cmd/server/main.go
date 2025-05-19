package main

import (
	"backend/internal/database"
	"fmt"
	"log"
	"net/http"
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

	// Handle DB
	mongoURI := "mongodb://localhost:27017"
	err := database.ConnectDB(mongoURI)
	if err != nil {
		log.Fatalf("Could not connect to the database: %v", err)
	}

	defer database.DisconnectDB()

	fmt.Fprintf(w, "User registered: %s (Firstname: %s, Lastname: %s)", username, firstname, lastname)
}

func main() {
	http.HandleFunc("/", helloHandler)
	http.HandleFunc("/greet", greetHandler)
	http.HandleFunc("/register", registerHandler)

	fmt.Println("Server listening on port 8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
