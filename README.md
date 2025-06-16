# OJ (Online Judge)

This is an Online Judge platform for competitive programming practice and contests. The platform supports multiple programming languages, real-time code execution, and automated evaluation of submissions.

## Features

- **User Authentication**: Register, login, and manage your account
- **Social Login**: Sign in using Google, Facebook, or GitHub accounts
- **Guest Access**: Try the platform without registration using a guest account
- **Problem Solving**: Browse problems by difficulty and topic
- **Code Editor**: Built-in Monaco editor with syntax highlighting
- **Multiple Languages**: Support for Python, JavaScript, C++, and Java
- **Real-time Execution**: Test your code with custom inputs before submission (via sandboxed language executors)
- **Automated Evaluation**: Submit solutions to be evaluated against test cases
- **Detailed Feedback**: Receive specific error messages and test case results
- **Submission History**: Track your progress and review past submissions
- **Pseudocode Support**: Convert pseudocode to Python for execution
- **AI Code Completion**: Get intelligent code suggestions as you type.
- **Rate Limiting**: Protection against excessive usage of AI-powered and resource-intensive services

## Getting Started

### Prerequisites

- Go 1.24+ for backend
- Node.js 16+ for frontend
- MongoDB instance

### Setup

1. Clone the repository
2. Set up environment variables in `backend/.env`:
   ```
   MONGO_URI=mongodb://localhost:27017
   JWT_SECRET_KEY=your_secret_key
   PORT=8080
   ```
3. Start the backend:
   ```bash
   cd backend
   go run cmd/server/main.go
   ```
4. Start the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. Build & start language-executor containers (Python, JS, C++, Java)
   ```bash
   cd docker  # contains docker-compose.yml and language executors
   docker compose up --build -d  # builds images and starts on ports 8001-8004
   ```

6. (Re)start the backend & frontend as usual. The backend now delegates code execution to those containers.

## Creating an Admin User

To create an admin user, run the following command from the root directory of the project:

```bash
./create_admin.sh <firstname> <lastname> <username> <password>
```
Replace `<firstname>`, `<lastname>`, `<username>`, and `<password>` with the desired details for your admin user.

## Error Classification

The platform intelligently classifies errors to provide helpful feedback:

- **Compilation Errors**: Syntax errors, name errors, and other code structure issues
- **Runtime Errors**: Errors that occur during execution (e.g., division by zero)
- **Time Limit Exceeded**: Solutions that take too long to execute
- **Memory Limit Exceeded**: Solutions that use too much memory
- **Wrong Answer**: Solutions that produce incorrect output for test cases

## Architecture

- **Backend**: Go REST API with JWT authentication and MongoDB integration
- **Frontend**: Next.js application with React, TypeScript, and Tailwind CSS
- **Code Execution**: Sandboxed environment for safe code execution, powered by per-language Docker micro-services

## New API (June 2025)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/last-code` | GET | Retrieve the most recent code draft for the authenticated user for a given `problem_id` (and optional `language`). |
| `/convert-code` | POST | Convert pseudocode to Python code. |
| `/api/rate-limits` | GET | Get current rate limit status and remaining usage for the authenticated user. |
| `/api/admin/rate-limits` | PUT/POST | Admin endpoint to update rate limits for a specific user. |

The frontend now uses this endpoint to repopulate the Monaco editor when you revisit a problem page, falling back to `localStorage` first.

## Rate Limiting

The platform includes rate limiting for resource-intensive services:

- **Code Completion**: Limits on AI-powered code suggestion requests
- **Pseudocode Conversion**: Limits on pseudocode to Python conversion 
- **Code Execution**: Limits on code execution requests
- **Code Submission**: Limits on solution submissions
- **Guest Account Creation**: Limited to 3 accounts per hour per IP address

Rate limits are set per service and reset hourly. Regular users and administrators have different limit thresholds. The API returns appropriate HTTP headers to track usage:

- `X-RateLimit-Limit`: Maximum requests allowed per hour
- `X-RateLimit-Remaining`: Remaining requests in the current window
- `X-RateLimit-Reset`: Time when the rate limit window resets (ISO 8601 format)

When a rate limit is exceeded, the API returns a 429 Too Many Requests status code.

## Contribution

Contributions are welcome! Please feel free to submit a Pull Request.

## Authentication System

The authentication system uses JWT tokens stored in HTTP-only cookies for secure user sessions.

### Authentication Flow

1. **Login/Registration**: When a user logs in or registers, the server generates a JWT token and sets it as an HTTP-only cookie.
2. **Social Login**: Users can sign in with Google, Facebook, or GitHub accounts.
3. **Guest Access**: Users can create temporary guest accounts for trying the platform.
4. **Auth Status**: The client can check the user's authentication status using the `/api/auth-status` endpoint.
5. **Logout**: Logout properly invalidates the cookie both on the server and client side.

### Authentication Components

- **Backend Handlers**: 
  - `LoginHandler`: Validates credentials and sets JWT cookie
  - `LogoutHandler`: Invalidates JWT cookie
  - `AuthStatusHandler`: Checks JWT validity and returns user info
  - `OAuthLoginHandler`: Initiates OAuth flow with providers
  - `OAuthCallbackHandler`: Handles OAuth provider callbacks
  - `GuestLoginHandler`: Creates temporary guest accounts
  
- **Frontend Components**:
  - `useAuth` hook: Centralized auth state management
  - `AuthContext`: React context for sharing auth state
  - `AuthProvider`: Provider component that wraps the application
  
### OAuth Configuration

To enable social login, set the following environment variables in the backend `.env` file:

```
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook OAuth
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Base URL for OAuth redirects
OAUTH_REDIRECT_BASE_URL=http://localhost:8080
```

You'll need to create OAuth applications on the respective platforms and configure the callback URLs as:
- Google: `http://localhost:8080/auth/callback/google`
- Facebook: `http://localhost:8080/auth/callback/facebook`
- GitHub: `http://localhost:8080/auth/callback/github`

**Important Note for GitHub OAuth**: Ensure the "Authorization callback URL" configured in your GitHub OAuth application settings (found under "Developer settings" -> "OAuth Apps" on GitHub) *exactly matches* the `OAUTH_REDIRECT_BASE_URL` from your `.env` file combined with the `/auth/callback/github` path. A mismatch will result in a "redirect_uri is not associated with this application" error.

# Frontend URL for OAuth Redirects
FRONTEND_URL=http://localhost:3000
```

The FRONTEND_URL environment variable specifies where users should be redirected after a successful OAuth login. Make sure this points to your running frontend application.

### Security Measures

- JWT tokens are stored in HTTP-only cookies to prevent JavaScript access
- Secure flag ensures cookies are only sent over HTTPS
- SameSite policy for CSRF protection
- Proper cookie expiration handling
- CSRF protection for OAuth flows using state parameters
- Rate limiting for guest account creation (3 per hour per IP)

### Recent Fixes

- Fixed logout functionality to properly invalidate cookies
- Implemented client-side cookie clearing as a fallback
- Added route change detection to refresh auth status on navigation
- Centralized auth state management using React Context
- Improved submissions search functionality to include problem name and fixed filtering issues
- Removed problem ID search, only problem name search is available for submissions
- Implemented client-side caching for responses from `/problems`, `/problems/{id}`, and `/problems/{id}/stats` endpoints, with a cache lifetime of 5 minutes.