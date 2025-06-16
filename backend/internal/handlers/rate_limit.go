package handlers

import (
	"backend/internal/middleware"
	"net/http"
)

// GetUserRateLimitsHandler retrieves the current rate limits for a user
func GetUserRateLimitsHandler(w http.ResponseWriter, r *http.Request) {
	// Delegate to the middleware implementation
	middleware.GetRateLimitsHandler(w, r)
}

// AdminUpdateUserRateLimitsHandler allows admins to update a user's rate limits
func AdminUpdateUserRateLimitsHandler(w http.ResponseWriter, r *http.Request) {
	// Delegate to the middleware implementation
	middleware.AdminUpdateRateLimitsHandler(w, r)
}
