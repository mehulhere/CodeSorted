package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
)

// GithubProvider implements OAuthProvider interface for GitHub
type GithubProvider struct {
	OAuthConfig
}

// GithubUserInfo contains user information returned from GitHub
type GithubUserInfo struct {
	ID        int    `json:"id"`
	Login     string `json:"login"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
}

// GithubEmail represents an email entry from GitHub's email API
type GithubEmail struct {
	Email    string `json:"email"`
	Primary  bool   `json:"primary"`
	Verified bool   `json:"verified"`
}

// NewGithubProvider creates a new GitHub OAuth provider
func NewGithubProvider() *GithubProvider {
	clientID := os.Getenv("GITHUB_CLIENT_ID")
	clientSecret := os.Getenv("GITHUB_CLIENT_SECRET")

	if clientID == "" || clientSecret == "" {
		log.Println("GitHub OAuth is not configured: missing client ID or client secret")
		return nil
	}

	config := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  GetRedirectURL("github"),
		Scopes: []string{
			"user:email",
			"read:user",
		},
		Endpoint: github.Endpoint,
	}

	return &GithubProvider{
		OAuthConfig: OAuthConfig{
			Config: config,
			Name:   "github",
		},
	}
}

// GetAuthURL returns the URL for GitHub OAuth authentication
func (p *GithubProvider) GetAuthURL(state string) string {
	return p.Config.AuthCodeURL(state)
}

// GetUserInfo exchanges the authorization code for user information
func (p *GithubProvider) GetUserInfo(code string) (*UserInfo, error) {
	token, err := p.Config.Exchange(context.Background(), code)
	if err != nil {
		return nil, err
	}

	// Use the token to get user info
	client := p.Config.Client(context.Background(), token)
	resp, err := client.Get("https://api.github.com/user")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("failed to get user info from GitHub")
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var githubUser GithubUserInfo
	if err := json.Unmarshal(data, &githubUser); err != nil {
		return nil, err
	}

	// If email is not public, fetch email separately
	if githubUser.Email == "" {
		email, err := p.fetchGithubEmail(client)
		if err != nil {
			return nil, err
		}
		githubUser.Email = email
	}

	// Extract first and last name
	firstName, lastName := splitName(githubUser.Name)

	// Convert to standardized UserInfo
	return &UserInfo{
		ID:        fmt.Sprintf("%d", githubUser.ID),
		Email:     githubUser.Email,
		Name:      githubUser.Name,
		FirstName: firstName,
		LastName:  lastName,
		Picture:   githubUser.AvatarURL,
		Provider:  "github",
	}, nil
}

// fetchGithubEmail gets the primary verified email from GitHub's email API
func (p *GithubProvider) fetchGithubEmail(client *http.Client) (string, error) {
	resp, err := client.Get("https://api.github.com/user/emails")
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", errors.New("failed to get email from GitHub")
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var emails []GithubEmail
	if err := json.Unmarshal(data, &emails); err != nil {
		return "", err
	}

	// Find primary email
	for _, email := range emails {
		if email.Primary && email.Verified {
			return email.Email, nil
		}
	}

	// If no primary email found, use the first verified one
	for _, email := range emails {
		if email.Verified {
			return email.Email, nil
		}
	}

	return "", errors.New("no verified email found in GitHub account")
}

// GetName returns the provider name
func (p *GithubProvider) GetName() string {
	return p.Name
}

// splitName splits a full name into first and last name
func splitName(fullName string) (string, string) {
	if fullName == "" {
		return "", ""
	}

	parts := strings.Fields(fullName)
	if len(parts) == 1 {
		return parts[0], ""
	}

	return parts[0], strings.Join(parts[1:], " ")
}
