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

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/facebook"
)

// FacebookProvider implements OAuthProvider interface for Facebook
type FacebookProvider struct {
	OAuthConfig
}

// FacebookUserInfo contains user information returned from Facebook
type FacebookUserInfo struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Picture   struct {
		Data struct {
			URL string `json:"url"`
		} `json:"data"`
	} `json:"picture"`
}

// NewFacebookProvider creates a new Facebook OAuth provider
func NewFacebookProvider() *FacebookProvider {
	clientID := os.Getenv("FACEBOOK_CLIENT_ID")
	clientSecret := os.Getenv("FACEBOOK_CLIENT_SECRET")

	if clientID == "" || clientSecret == "" {
		log.Println("Facebook OAuth is not configured: missing client ID or client secret")
		return nil
	}

	config := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  GetRedirectURL("facebook"),
		Scopes: []string{
			"email",
			"public_profile",
		},
		Endpoint: facebook.Endpoint,
	}

	return &FacebookProvider{
		OAuthConfig: OAuthConfig{
			Config: config,
			Name:   "facebook",
		},
	}
}

// GetAuthURL returns the URL for Facebook OAuth authentication
func (p *FacebookProvider) GetAuthURL(state string) string {
	return p.Config.AuthCodeURL(state)
}

// GetUserInfo exchanges the authorization code for user information
func (p *FacebookProvider) GetUserInfo(code string) (*UserInfo, error) {
	token, err := p.Config.Exchange(context.Background(), code)
	if err != nil {
		return nil, err
	}

	// Use the token to get user info
	client := p.Config.Client(context.Background(), token)
	resp, err := client.Get("https://graph.facebook.com/me?fields=id,name,email,first_name,last_name,picture.type(large)")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get user info from Facebook: %s", resp.Status)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var fbUser FacebookUserInfo
	if err := json.Unmarshal(data, &fbUser); err != nil {
		return nil, err
	}

	if fbUser.Email == "" {
		return nil, errors.New("email not provided by Facebook")
	}

	// Convert to standardized UserInfo
	return &UserInfo{
		ID:        fbUser.ID,
		Email:     fbUser.Email,
		Name:      fbUser.Name,
		FirstName: fbUser.FirstName,
		LastName:  fbUser.LastName,
		Picture:   fbUser.Picture.Data.URL,
		Provider:  "facebook",
	}, nil
}

// GetName returns the provider name
func (p *FacebookProvider) GetName() string {
	return p.Name
}
