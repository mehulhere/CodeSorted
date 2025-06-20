package auth

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"golang.org/x/oauth2"
)

// OAuthProvider defines the interface for OAuth providers
type OAuthProvider interface {
	GetAuthURL(state string) string
	GetUserInfo(code string) (*UserInfo, error)
	GetName() string
}

// UserInfo contains the standardized user information from OAuth providers
type UserInfo struct {
	ID        string
	Email     string
	Name      string
	FirstName string
	LastName  string
	Picture   string
	Provider  string
}

// OAuthConfig holds shared configuration for OAuth providers
type OAuthConfig struct {
	Config *oauth2.Config
	Name   string
}

// Initialize OAuth configuration
func init() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: Error loading .env file. Using environment variables.")
	}
}

// GenerateState generates a random state string for OAuth flow
func GenerateState() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

// GetRedirectURL constructs the OAuth redirect URL based on environment settings
func GetRedirectURL(provider string) string {
	baseURL := os.Getenv("OAUTH_REDIRECT_BASE_URL")
	if baseURL == "" {
		baseURL = `${process.env.OAUTH_REDIRECT_BASE_URL}`
	}
	return fmt.Sprintf("%s/auth/callback/%s", baseURL, provider)
}

// GetOAuthProviders returns a map of available OAuth providers
func GetOAuthProviders() map[string]OAuthProvider {
	providers := make(map[string]OAuthProvider)

	// Initialize Google provider if credentials are available
	googleProvider := NewGoogleProvider()
	if googleProvider != nil {
		providers["google"] = googleProvider
	}

	// Initialize Facebook provider if credentials are available
	facebookProvider := NewFacebookProvider()
	if facebookProvider != nil {
		providers["facebook"] = facebookProvider
	}

	// Initialize GitHub provider if credentials are available
	githubProvider := NewGithubProvider()
	if githubProvider != nil {
		providers["github"] = githubProvider
	}

	return providers
}

// GetProvider returns a specific OAuth provider by name
func GetProvider(name string) OAuthProvider {
	providers := GetOAuthProviders()
	return providers[name]
}
