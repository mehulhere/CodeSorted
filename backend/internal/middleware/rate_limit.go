package middleware

import (
	"backend/internal/database"
	"backend/internal/models"
	"backend/internal/types"
	"backend/internal/utils"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// InitRateLimitCollection ensures indexes for the rate_limits collection
func InitRateLimitCollection() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rateLimitsCollection := database.GetCollection("OJ", "rate_limits")

	// Create indexes for efficient queries
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "user_id", Value: 1}},
		Options: options.Index().SetUnique(true),
	}

	_, err := rateLimitsCollection.Indexes().CreateOne(ctx, indexModel)
	if err != nil {
		log.Printf("Error creating index for rate_limits collection: %v", err)
		return err
	}

	return nil
}

// checkAndUpdateRateLimit checks if a user has exceeded their rate limit for a specific service
// Returns:
// - allowed: whether the request is allowed
// - stats: rate limit stats to return to the client
// - err: any error that occurred
func checkAndUpdateRateLimit(userID primitive.ObjectID, username string, isAdmin bool, service models.RateLimitedService) (bool, *models.RateLimitStats, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rateLimitsCollection := database.GetCollection("OJ", "rate_limits")

	// Try to find existing rate limit document for this user
	var rateLimit models.RateLimit
	err := rateLimitsCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&rateLimit)

	now := time.Now()

	// If no document exists, create a new one with default limits
	if err == mongo.ErrNoDocuments {
		rateLimit = models.RateLimit{
			UserID:    userID,
			Username:  username,
			IsAdmin:   isAdmin,
			Services:  models.DefaultRateLimits(isAdmin),
			CreatedAt: now,
			UpdatedAt: now,
		}

		_, err = rateLimitsCollection.InsertOne(ctx, rateLimit)
		if err != nil {
			log.Printf("Failed to create rate limit document for user %s: %v", username, err)
			return false, nil, err
		}
	} else if err != nil {
		log.Printf("Error retrieving rate limit for user %s: %v", username, err)
		return false, nil, err
	}

	// Find the service limit
	var serviceLimit *models.ServiceLimit
	var serviceIndex int = -1

	for i, sl := range rateLimit.Services {
		if sl.Service == service {
			serviceLimit = &rateLimit.Services[i]
			serviceIndex = i
			break
		}
	}

	// If service wasn't found in the list, add it with default limits
	if serviceLimit == nil {
		// Get default limits
		defaultLimits := models.DefaultRateLimits(isAdmin)

		// Find the service in default limits
		for _, dl := range defaultLimits {
			if dl.Service == service {
				rateLimit.Services = append(rateLimit.Services, dl)
				serviceLimit = &rateLimit.Services[len(rateLimit.Services)-1]
				serviceIndex = len(rateLimit.Services) - 1
				break
			}
		}

		if serviceLimit == nil {
			log.Printf("Service %s not found in default limits", service)
			return false, nil, nil
		}
	}

	// Check if the time window has expired and reset if needed
	windowDuration := time.Duration(serviceLimit.WindowMinutes) * time.Minute
	if now.Sub(serviceLimit.WindowStartedAt) > windowDuration {
		// Window expired, reset counter
		serviceLimit.CurrentCount = 0
		serviceLimit.WindowStartedAt = now
	}

	// Check if user has exceeded their limit
	log.Printf("Current count: %d, Max requests: %d", serviceLimit.CurrentCount, serviceLimit.MaxRequests)
	if serviceLimit.CurrentCount >= serviceLimit.MaxRequests {
		// Calculate time until reset
		resetTime := serviceLimit.WindowStartedAt.Add(windowDuration)
		log.Printf("Rate limit exceeded for user %s, service %s. Reset time: %s", username, service, resetTime)
		// Create stats for response
		stats := &models.RateLimitStats{
			Service:      string(service),
			RemainingUse: 0,
			ResetAt:      resetTime,
			LimitPerHour: serviceLimit.MaxRequests,
		}

		return false, stats, nil
	}

	// Increment counter and update last request time
	serviceLimit.CurrentCount++
	serviceLimit.LastRequestAt = now

	// Update the specific service in the database
	updatePath := "services." + strconv.Itoa(serviceIndex)
	update := bson.M{
		"$set": bson.M{
			updatePath + ".current_count":   serviceLimit.CurrentCount,
			updatePath + ".last_request_at": serviceLimit.LastRequestAt,
			"updated_at":                    now,
		},
	}

	_, err = rateLimitsCollection.UpdateOne(
		ctx,
		bson.M{"user_id": userID},
		update,
	)

	if err != nil {
		log.Printf("Failed to update rate limit for user %s, service %s: %v", username, service, err)
		return false, nil, err
	}

	// Calculate remaining uses and reset time
	resetTime := serviceLimit.WindowStartedAt.Add(windowDuration)
	remainingUses := serviceLimit.MaxRequests - serviceLimit.CurrentCount

	// Create stats for response
	stats := &models.RateLimitStats{
		Service:      string(service),
		RemainingUse: remainingUses,
		ResetAt:      resetTime,
		LimitPerHour: serviceLimit.MaxRequests,
	}

	return true, stats, nil
}

// RateLimitMiddleware creates a middleware that enforces rate limits for specific services
func RateLimitMiddleware(service models.RateLimitedService) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			// Get user info from JWT token
			cookie, err := r.Cookie("authToken")
			if err != nil {
				utils.SendJSONError(w, "Authentication required", http.StatusUnauthorized)
				return
			}

			// Parse token
			tokenStr := cookie.Value
			claims := &types.Claims{}
			token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
				return jwtKey, nil
			})

			if err != nil || !token.Valid {
				log.Printf("Token: %v", token)
				utils.SendJSONError(w, "Invalid authentication token", http.StatusUnauthorized)
				return
			}

			// Convert string ID to ObjectID
			userID, err := primitive.ObjectIDFromHex(claims.UserID)
			if err != nil {
				utils.SendJSONError(w, "Invalid user ID in token", http.StatusInternalServerError)
				return
			}

			// Check rate limit
			allowed, stats, err := checkAndUpdateRateLimit(userID, claims.Username, claims.IsAdmin, service)
			if err != nil {
				utils.SendJSONError(w, "Error checking rate limit", http.StatusInternalServerError)
				return
			}

			if !allowed {
				// Set rate limit headers
				w.Header().Set("X-RateLimit-Limit", strconv.Itoa(stats.LimitPerHour))
				w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(stats.RemainingUse))
				w.Header().Set("X-RateLimit-Reset", stats.ResetAt.Format(time.RFC3339))
				w.Header().Set("X-RateLimit-Service", stats.Service)

				utils.SendJSONError(w, "Rate limit exceeded for "+string(service)+". Please try again after "+stats.ResetAt.Format(time.RFC3339), http.StatusTooManyRequests)
				return
			}

			// Add rate limit info to response headers
			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(stats.LimitPerHour))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(stats.RemainingUse))
			w.Header().Set("X-RateLimit-Reset", stats.ResetAt.Format(time.RFC3339))
			w.Header().Set("X-RateLimit-Service", stats.Service)

			// Call the next handler
			next(w, r)
		}
	}
}

// GetRateLimitsHandler returns the current rate limits for the authenticated user
func GetRateLimitsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendJSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get user info from JWT token
	cookie, err := r.Cookie("authToken")
	if err != nil {
		utils.SendJSONError(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	// Parse token
	tokenStr := cookie.Value
	claims := &types.Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})

	if err != nil || !token.Valid {
		utils.SendJSONError(w, "Invalid authentication token", http.StatusUnauthorized)
		return
	}

	// Get user's rate limits
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userID, err := primitive.ObjectIDFromHex(claims.UserID)
	if err != nil {
		utils.SendJSONError(w, "Invalid user ID in token", http.StatusInternalServerError)
		return
	}

	rateLimitsCollection := database.GetCollection("OJ", "rate_limits")

	var rateLimit models.RateLimit
	err = rateLimitsCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&rateLimit)

	if err == mongo.ErrNoDocuments {
		// Create default rate limits if none exist
		rateLimit = models.RateLimit{
			UserID:    userID,
			Username:  claims.Username,
			IsAdmin:   claims.IsAdmin,
			Services:  models.DefaultRateLimits(claims.IsAdmin),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		_, err = rateLimitsCollection.InsertOne(ctx, rateLimit)
		if err != nil {
			utils.SendJSONError(w, "Failed to create rate limits", http.StatusInternalServerError)
			return
		}
	} else if err != nil {
		log.Printf("Error retrieving rate limits for user %s: %v", claims.Username, err)
		utils.SendJSONError(w, "Failed to retrieve rate limits", http.StatusInternalServerError)
		return
	}

	// Calculate remaining uses and stats for each service
	now := time.Now()
	stats := make([]models.RateLimitStats, 0, len(rateLimit.Services))

	for _, serviceLimit := range rateLimit.Services {
		windowDuration := time.Duration(serviceLimit.WindowMinutes) * time.Minute
		resetTime := serviceLimit.WindowStartedAt.Add(windowDuration)

		// If window has expired, calculate as if the counter is reset
		remainingUses := serviceLimit.MaxRequests
		if now.Before(resetTime) {
			remainingUses = serviceLimit.MaxRequests - serviceLimit.CurrentCount
		}

		stats = append(stats, models.RateLimitStats{
			Service:      string(serviceLimit.Service),
			RemainingUse: remainingUses,
			ResetAt:      resetTime,
			LimitPerHour: serviceLimit.MaxRequests,
		})
	}

	// Return the stats
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(stats)
}

// AdminUpdateRateLimitsHandler allows admin users to update rate limits for a specific user
func AdminUpdateRateLimitsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPost {
		utils.SendJSONError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request body
	var updateRequest struct {
		UserID   string `json:"user_id"`
		Service  string `json:"service"`
		NewLimit int    `json:"new_limit"`
	}

	if err := utils.ParseJSON(r, &updateRequest); err != nil {
		utils.SendJSONError(w, "Invalid request: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Validate input
	if updateRequest.UserID == "" || updateRequest.Service == "" || updateRequest.NewLimit < 0 {
		utils.SendJSONError(w, "Invalid parameters", http.StatusBadRequest)
		return
	}

	// Convert user ID string to ObjectID
	userID, err := primitive.ObjectIDFromHex(updateRequest.UserID)
	if err != nil {
		utils.SendJSONError(w, "Invalid user ID format", http.StatusBadRequest)
		return
	}

	// Get rate limits for the user
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rateLimitsCollection := database.GetCollection("OJ", "rate_limits")

	var rateLimit models.RateLimit
	err = rateLimitsCollection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&rateLimit)

	if err == mongo.ErrNoDocuments {
		utils.SendJSONError(w, "User rate limits not found", http.StatusNotFound)
		return
	} else if err != nil {
		log.Printf("Error retrieving rate limits for user ID %s: %v", updateRequest.UserID, err)
		utils.SendJSONError(w, "Failed to retrieve rate limits", http.StatusInternalServerError)
		return
	}

	// Find the service to update
	serviceFound := false
	for i, serviceLimit := range rateLimit.Services {
		if string(serviceLimit.Service) == updateRequest.Service {
			// Update the service limit
			updatePath := "services." + strconv.Itoa(i) + ".max_requests"
			_, err = rateLimitsCollection.UpdateOne(
				ctx,
				bson.M{"user_id": userID},
				bson.M{
					"$set": bson.M{
						updatePath:   updateRequest.NewLimit,
						"updated_at": time.Now(),
					},
				},
			)

			if err != nil {
				log.Printf("Failed to update rate limit: %v", err)
				utils.SendJSONError(w, "Failed to update rate limit", http.StatusInternalServerError)
				return
			}

			serviceFound = true
			break
		}
	}

	if !serviceFound {
		utils.SendJSONError(w, "Service not found in user's rate limits", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Rate limit updated successfully"})
}

// Structure to store IP-based rate limits in memory
type ipRateLimit struct {
	count     int
	resetTime time.Time
	mutex     sync.Mutex
}

// Map to store IP-based rate limits
var ipRateLimits = struct {
	limits map[string]*ipRateLimit
	mutex  sync.RWMutex
}{
	limits: make(map[string]*ipRateLimit),
}

// IP-based rate limiting middleware for guest account creation
func IPRateLimitMiddleware(maxRequests int, windowMinutes int) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			// Get the client's IP address
			ip := r.Header.Get("X-Forwarded-For")
			if ip == "" {
				ip = r.RemoteAddr
			}

			// Get current time
			now := time.Now()

			// Calculate window duration
			windowDuration := time.Duration(windowMinutes) * time.Minute

			// Check if the IP has rate limit info
			ipRateLimits.mutex.RLock()
			limit, exists := ipRateLimits.limits[ip]
			ipRateLimits.mutex.RUnlock()

			if !exists {
				// Create a new rate limit entry for this IP
				limit = &ipRateLimit{
					count:     0,
					resetTime: now.Add(windowDuration),
					mutex:     sync.Mutex{},
				}

				ipRateLimits.mutex.Lock()
				ipRateLimits.limits[ip] = limit
				ipRateLimits.mutex.Unlock()
			}

			// Lock the specific IP's rate limit for update
			limit.mutex.Lock()
			defer limit.mutex.Unlock()

			// Check if we need to reset the window
			if now.After(limit.resetTime) {
				limit.count = 0
				limit.resetTime = now.Add(windowDuration)
			}

			// Check if the IP has exceeded its limit
			if limit.count >= maxRequests {
				// Set rate limit headers
				w.Header().Set("X-RateLimit-Limit", strconv.Itoa(maxRequests))
				w.Header().Set("X-RateLimit-Remaining", "0")
				w.Header().Set("X-RateLimit-Reset", limit.resetTime.Format(time.RFC3339))
				w.Header().Set("X-RateLimit-Service", string(models.ServiceGuestCreation))

				utils.SendJSONError(w, "Rate limit exceeded for guest account creation. Please try again after "+limit.resetTime.Format(time.RFC3339), http.StatusTooManyRequests)
				return
			}

			// Increment the counter
			limit.count++

			// Set rate limit headers
			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(maxRequests))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(maxRequests-limit.count))
			w.Header().Set("X-RateLimit-Reset", limit.resetTime.Format(time.RFC3339))
			w.Header().Set("X-RateLimit-Service", string(models.ServiceGuestCreation))

			// Call the next handler
			next(w, r)
		}
	}
}
