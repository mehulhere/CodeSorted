package auth

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// GoogleProvider implements OAuthProvider interface for Google
type GoogleProvider struct {
	OAuthConfig
}

// GoogleUserInfo contains user information returned from Google
type GoogleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
	Locale        string `json:"locale"`
}

// NewGoogleProvider creates a new Google OAuth provider
func NewGoogleProvider() *GoogleProvider {
	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	clientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")

	if clientID == "" || clientSecret == "" {
		log.Println("Google OAuth is not configured: missing client ID or client secret")
		return nil
	}

	config := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  GetRedirectURL("google"),
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}

	return &GoogleProvider{
		OAuthConfig: OAuthConfig{
			Config: config,
			Name:   "google",
		},
	}
}

// GetAuthURL returns the URL for Google OAuth authentication
func (p *GoogleProvider) GetAuthURL(state string) string {
	return p.Config.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

// GetUserInfo exchanges the authorization code for user information
func (p *GoogleProvider) GetUserInfo(code string) (*UserInfo, error) {
	token, err := p.Config.Exchange(context.Background(), code)
	if err != nil {
		return nil, err
	}

	// Use the token to get user info
	client := p.Config.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("failed to get user info from Google")
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var googleUser GoogleUserInfo
	if err := json.Unmarshal(data, &googleUser); err != nil {
		return nil, err
	}

	// Convert to standardized UserInfo
	return &UserInfo{
		ID:        googleUser.ID,
		Email:     googleUser.Email,
		Name:      googleUser.Name,
		FirstName: googleUser.GivenName,
		LastName:  googleUser.FamilyName,
		Picture:   googleUser.Picture,
		Provider:  "google",
	}, nil
}

// GetName returns the provider name
func (p *GoogleProvider) GetName() string {
	return p.Name
}
