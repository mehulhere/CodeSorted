package main

import (
	"backend/internal/auth"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	err := godotenv.Load("../.env")
	if err != nil {
		log.Println("Warning: Error loading .env file. Using environment variables.")
	}

	// Test Google provider
	googleProvider := auth.NewGoogleProvider()
	if googleProvider != nil {
		fmt.Println("✅ Google OAuth provider is configured")
		fmt.Printf("   Redirect URL: %s\n", auth.GetRedirectURL("google"))
	} else {
		fmt.Println("❌ Google OAuth provider is not configured")
	}

	// Test Facebook provider
	facebookProvider := auth.NewFacebookProvider()
	if facebookProvider != nil {
		fmt.Println("✅ Facebook OAuth provider is configured")
		fmt.Printf("   Redirect URL: %s\n", auth.GetRedirectURL("facebook"))
	} else {
		fmt.Println("❌ Facebook OAuth provider is not configured")
	}

	// Test GitHub provider
	githubProvider := auth.NewGithubProvider()
	if githubProvider != nil {
		fmt.Println("✅ GitHub OAuth provider is configured")
		fmt.Printf("   Redirect URL: %s\n", auth.GetRedirectURL("github"))
	} else {
		fmt.Println("❌ GitHub OAuth provider is not configured")
	}

	// Check if FRONTEND_URL is set
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL != "" {
		fmt.Println("✅ FRONTEND_URL is configured:", frontendURL)
	} else {
		fmt.Println("⚠️ FRONTEND_URL is not set, will default to http://localhost:3000")
	}

	fmt.Println("\nImportant: Make sure these redirect URLs are correctly configured in your OAuth provider dashboards!")
}
