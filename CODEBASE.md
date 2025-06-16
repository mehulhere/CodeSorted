# OJ (Online Judge) Codebase Documentation 🚀

## TLDR 📝
An online judge platform with a Go backend and Next.js frontend. Users can register, login, browse coding problems, and submit solutions for automated testing against test cases. The backend handles user authentication with JWT, connects to a MongoDB database, and executes user-submitted code in a sandboxed environment. The frontend provides a rich user interface with the Monaco Editor for an integrated development experience.

## Project Overview 🌐
This repository contains a complete Online Judge (OJ) system where programmers can solve coding problems and have their solutions automatically evaluated. The system consists of:

- **Backend**: Go-based REST API with JWT authentication, MongoDB integration, and AI integration for code analysis and conversion.
- **Frontend**: Next.js application with React 19, TypeScript, and Tailwind CSS

## Directory Structure 📂

```
.
├── backend/
│ ├── cmd/
│ │ ├── admin/ # Admin utility scripts (e.g., create_admin.go)
│ │ └── server/ # Server entry point (main.go)
│ ├── internal/
│ │ ├── ai/ # AI-powered code analysis and conversion
│ │ ├── database/ # Database connection and operations
│ │ ├── handlers/ # HTTP request handlers
│ │ ├── middleware/ # HTTP middleware (CORS, JWT auth, Admin checks)
│ │ ├── models/ # Data models for User, Problem, TestCase etc.
│ │ ├── types/ # Go type definitions
│ │ └── utils/ # Utility functions (e.g., sending JSON errors)
│ ├── .env # Environment variables
│ └── go.mod # Go module dependencies
├── frontend/
│ ├── src/
│ │ ├── app/ # Next.js app directory layout and globals
│ │ ├── pages/ # User-facing page components (Login, Register, Problems)
│ │ │ └── admin/ # Admin-specific pages
│ │ │ ├── problems/ # Problem management pages
│ │ │ │ ├── create.tsx # Page for creating new problems
│ │ │ │ └── [problemId]/ # Dynamic route for individual problem admin tasks
│ │ │ │ └── testcases/ # Test case management for a specific problem
│ │ │ │ └── create.tsx # Page for adding test cases to a problem
│ │ │ │ └── index.tsx # Problem solving page
│ │ │ └── types/ # TypeScript type definitions
│ │ ├── public/ # Static assets
│ │ └── package.json # Frontend dependencies and scripts
```

## Backend (Go) 🔧

### Technologies
- Go 1.24.3
- MongoDB (via `mongo-driver`)
- JWT for authentication (`golang-jwt/jwt`)

### Core Components (Updated June 2025)

#### Database (`database/mongodb.go`)
- **Connection**: Establishes a connection to MongoDB using a provided URI. It uses a `context.WithTimeout` to prevent indefinite hangs.
- **Health Check**: Pings the primary database node to verify the connection is live before proceeding.
- **Index Management**: Automatically ensures unique indexes on the `users` collection for both `username` and `email` fields to maintain data integrity.
- **Collection Access**: Provides a `GetCollection` helper function for easy access to different MongoDB collections.

#### Authentication (`handlers/auth.go`)
- **Registration (`/register`)**:
    - Validates user input (email format, password length).
    - Hashes the user's password using `bcrypt`.
    - Creates a new user in the database, with `IsAdmin` defaulting to `false`.
    - Generates a JWT token containing user claims (`UserID`, `Username`, `Email`, `IsAdmin`).
    - Sets the JWT as a secure, `HttpOnly` cookie to prevent XSS attacks.
- **Login (`/login`)**:
    - Allows users to log in with either their username or email.
    - Compares the provided password with the stored hash using `bcrypt.CompareHashAndPassword`.
    - Issues a new JWT via an `HttpOnly` cookie upon successful authentication, which now includes the `IsAdmin` status.
- **OAuth Authentication (`/auth/login/` and `/auth/callback/`)**:
    - Supports social login with Google, Facebook, and GitHub.
    - The `OAuthLoginHandler` initiates the OAuth flow by redirecting to the provider's authorization page.
    - The `OAuthCallbackHandler` processes the provider's response and creates or updates user accounts.
    - Uses CSRF protection via state parameters to prevent cross-site request forgery attacks.
    - If a user with the same email already exists, it links the OAuth account to the existing user.
    - If no user exists, it creates a new account with information from the OAuth provider.
    - Automatically generates random passwords and usernames for new OAuth users.
    - Sets the same secure JWT cookie as the regular login flow.

#### Middleware (`middleware/middleware.go`)
- **`WithCORS`**: Handles Cross-Origin Resource Sharing, allowing frontend requests from `http://localhost:3000`.
- **`JWTAuthMiddleware`**: Validates the JWT token from the `authToken` HTTP-only cookie. If valid, it allows access to protected routes.
- **`AdminAuthMiddleware`**: Wraps `JWTAuthMiddleware`. In addition to JWT validation, it extracts user claims from the request context and verifies if the `IsAdmin` flag is `true`. If not, it returns a `403 Forbidden` error. This ensures only authenticated admin users can access specific routes.
- **`CacheControlMiddleware`**: A new middleware that sets `Cache-Control` headers for API responses. It sets `Cache-Control: public, max-age=300` (5 minutes) and `Vary: Origin, Accept-Encoding` to optimize client-side caching for non-dynamic data. This middleware is applied selectively to improve performance on specific read-only endpoints.
- **`OAuthCallbackHandler`: Handles OAuth provider callbacks
- **`GuestLoginHandler`: Creates temporary guest accounts

**Important Note for GitHub OAuth**: When configuring your GitHub OAuth application, ensure that the "Authorization callback URL" in your GitHub OAuth app settings (under "Developer settings" -> "OAuth Apps") *exactly matches* the `OAUTH_REDIRECT_BASE_URL` from your backend's `.env` file appended with the specific callback path (e.g., `http://localhost:8080/auth/callback/github`). Any discrepancy will lead to a "redirect_uri is not associated with this application" error.

#### Code Execution (`handlers/execute.go`)
- **`ExecuteCodeHandler`**: Handles POST requests to `/execute` endpoint.
  - Validates payload containing language, code, and optional stdin.
  - Creates a temporary execution environment based on the language.
  - Executes the code with proper timeout constraints.
  - Captures stdout, stderr, execution time, and status.
  - Returns a standardized JSON response with execution results.

#### Code Conversion (`handlers/convert.go`)
- **`ConvertCodeHandler`**: Handles POST requests to `/convert-code` endpoint.
  - Validates payload containing pseudocode.
  - Calls `ai.ConvertPseudocodeToPython` to convert the pseudocode.
  - Returns the converted Python code.

#### Submission System (`handlers/submission.go`)
- **`SubmitSolutionHandler`**: Handles code submissions for evaluation against test cases.
  - Authenticates the user via JWT.
  - Validates submission data (problem ID, language, code).
  - If the language is "pseudocode", it converts it to Python using the AI service and stores both the original pseudocode and the converted Python code.
  - Creates a submission record in the database with pending status.
  - Creates a directory structure for the submission files.
  - Queues the submission for asynchronous processing.
  - Returns a submission ID to the client.
- **`processSubmissionQueue`**: Background worker that processes queued submissions.
  - Dequeues submissions one by one.
  - Prevents multiple workers from processing the same submission.
- **`processSubmission`**: Core function that evaluates a submission against test cases.
  - Retrieves the submission, problem, and test cases from the database.
  - Executes the code against each test case.
  - Records detailed results for each test case.
  - Determines the final submission status based on test case results.
  - Updates the submission record with the final status and metrics.
- **`updateSubmissionStatus`**: Updates the submission status and metrics in the database.
- **`executeCode`**: Wrapper around the utils.ExecuteCode function for submission-specific execution.
- **`GetSubmissionsHandler`**: Retrieves a list of submissions with filtering and pagination.
  - **Filtering**: Now supports filtering by `problem_name` (case-insensitive regex search), `status`, `language`, and `my_submissions` (user's own submissions). The `problem_id` search has been removed.
- **`GetSubmissionDetailsHandler`**: Retrieves detailed information about a specific submission.
  - Includes code, test case results, and execution metrics.
  - Implements permission checks to ensure users can only view their own submissions unless they're an admin.

#### AI (`internal/ai/ai.go`)
The `ai` package encapsulates all interactions with the external generative AI service (e.g., Google Gemini).
- **Code Complexity Analysis (`AnalyzeCodeComplexity`)**: Analyzes a code snippet to determine its time and memory complexity.
- **Pseudocode Conversion (`ConvertPseudocodeToPython`)**: Translates pseudocode into runnable Python code.
- **Code Completion (`GetCodeCompletion`)**: Provides context-aware code completion suggestions. To optimize performance, suggestions are cached in a MongoDB collection (`completion_cache`) with a 1-hour TTL. The function now communicates with the AI using a structured JSON format for more reliable response parsing.

#### Error Classification System

The submission system implements sophisticated error classification to provide accurate feedback:

1. **Execution-level Classification**:
   - The `ExecuteCode` function in `utils.go` detects different types of errors during execution.
   - For Python code, it specifically identifies common errors like syntax errors, name errors, and import errors.
   - It sets the appropriate status based on the error type: "compilation_error", "runtime_error", or "time_limit_exceeded".

2. **Test Case-level Classification**:
   - The `processSubmission` function in `submission.go` categorizes errors for each test case.
   - It examines both the error returned by executeCode and the status field.
   - Test case results include detailed error messages and categorization.

3. **Submission-level Classification**:
   - After all test cases are processed, a final status is determined for the submission.
   - For Python submissions, there's special handling to detect common errors in the output.
   - Python-specific errors like NameError, SyntaxError, IndentationError are classified as compilation errors.
   - The system distinguishes between "WRONG_ANSWER", "COMPILATION_ERROR", "RUNTIME_ERROR", "TIME_LIMIT_EXCEEDED", and "MEMORY_LIMIT_EXCEEDED".

#### Database Schema
Below is a detailed schema of the MongoDB collections used in the application:

- **`users` Collection**
  - **Purpose**: Stores user account information.
  - **Go Model**: `User`
  - **Fields**:
    - `_id` (ObjectID): Unique identifier for the user.
    - `firstname` (string): User's first name.
    - `lastname` (string): User's last name.
    - `username` (string): Unique username for the user.
    - `email` (string): User's email address.
    - `password` (string): Hashed password (stored securely).
    - `is_admin` (boolean): Flag indicating if the user has administrative privileges.
    - `created_at` (Date): Timestamp when the user account was created.
    - `updated_at` (Date): Timestamp of the last update to the user account.

- **`problems` Collection**
  - **Purpose**: Stores details about coding problems.
  - **Go Model**: `Problem`
  - **Fields**:
    - `_id` (ObjectID): Unique identifier for the problem.
    - `problem_id` (string): A custom, human-readable ID for the problem.
    - `title` (string): Title of the coding problem.
    - `difficulty` (string): Difficulty level (e.g., "Easy", "Medium", "Hard").
    - `statement` (string): Full problem description.
    - `constraints_text` (string): Text detailing input constraints.
    - `time_limit_ms` (int): Time limit for execution in milliseconds.
    - `memory_limit_mb` (int): Memory limit for execution in Megabytes.
    - `author` (string, optional): Username or ID of the problem author.
    - `tags` (array of strings, optional): List of tags (e.g., "Array", "Dynamic Programming").
    - `acceptance_rate` (float64, optional): Percentage of accepted submissions for this problem.
    - `created_at` (Date): Timestamp when the problem was created.
    - `updated_at` (Date): Timestamp of the last update to the problem.

- **`testcases` Collection**
  - **Purpose**: Stores test cases for each coding problem.
  - **Go Model**: `TestCase`
  - **Fields**:
    - `_id` (ObjectID): Unique identifier for the test case.
    - `problem_db_id` (ObjectID): Foreign key referencing the `_id` of the associated problem.
    - `input` (string): Input data for the test case.
    - `expected_output` (string): Expected output for the test case.
    - `is_sample` (boolean): Indicates if this is a sample test case visible to users.
    - `points` (int): Points awarded for passing this test case.
    - `notes` (string, optional): Optional notes about the test case.
    - `sequence_number` (int): Order of the test case.
    - `created_at` (Date): Timestamp when the test case was created.

- **`submissions` Collection**
  - **Purpose**: Stores details about user code submissions.
  - **Go Model**: `Submission`
  - **Fields**:
    - `_id` (ObjectID): Unique identifier for the submission.
    - `user_id` (ObjectID): Foreign key referencing the `_id` of the submitting user.
    - `problem_id` (string): The custom problem ID (e.g., "two-sum").
    - `language` (string): Programming language used (e.g., "python", "javascript").
    - `status` (string): Current status of the submission (e.g., "ACCEPTED", "WRONG_ANSWER").
    - `execution_time_ms` (int): Execution time in milliseconds.
    - `memory_used_kb` (int): Memory used in kilobytes.
    - `submitted_at` (Date): Timestamp when the submission was made.
    - `test_cases_passed` (int): Number of test cases passed.
    - `test_cases_total` (int): Total number of test cases.
    - `time_complexity` (string, optional): AI-generated time complexity analysis.
    - `memory_complexity` (string, optional): AI-generated memory complexity analysis.

- **`problem_stats` Collection**
  - **Purpose**: Stores aggregated statistics for problems, including AI-generated complexity analysis percentiles.
  - **Go Model**: `ProblemStats`
  - **Fields**:
    - `_id` (ObjectID): Unique identifier for the problem statistics document.
    - `problem_id` (string): The string ID of the problem.
    - `total_accepted_submissions` (int): Total number of accepted submissions for the problem.
    - `time_complexity_distribution` (map[string]int): Distribution of time complexities (e.g., {"O(N)": 10, "O(N^2)": 5}).
    - `memory_complexity_distribution` (map[string]int): Distribution of memory complexities.
    - `last_updated_at` (Date): Timestamp of the last update to these statistics.

- **`user_stats` Collection**
  - **Purpose**: Stores problem-solving statistics for each user.
  - **Go Model**: `UserStats`
  - **Fields**:
    - `_id` (ObjectID): Unique identifier for the user statistics document.
    - `user_id` (ObjectID): Foreign key referencing the `_id` of the user.
    - `username` (string): User's username.
    - `total_solved` (int): Total number of problems solved.
    - `easy_solved` (int): Number of easy problems solved.
    - `medium_solved` (int): Number of medium problems solved.
    - `hard_solved` (int): Number of hard problems solved.
    - `total_submissions` (int): Total number of submissions made.
    - `acceptance_rate` (float64): Overall acceptance rate.
    - `ranking` (int): User's current rank.
    - `total_users` (int): Total number of users on the platform (for ranking context).
    - `max_streak` (int): Longest daily check-in streak.
    - `current_streak` (int): Current daily check-in streak.
    - `last_updated_at` (Date): Timestamp of the last update to these statistics.

- **`user_checkins` Collection**
  - **Purpose**: Tracks a user's daily check-ins for activity visualization.
  - **Go Model**: `UserCheckin`
  - **Fields**:
    - `_id` (ObjectID): Unique identifier for the check-in record.
    - `user_id` (ObjectID): Foreign key referencing the `_id` of the user.
    - `username` (string): User's username.
    - `checkin_at` (Date): Exact timestamp of the check-in.
    - `date_string` (string): Date of check-in in YYYY-MM-DD format.

- **`user_language_stats` Collection**
  - **Purpose**: Stores aggregated programming language usage statistics for each user.
  - **Go Model**: `UserLanguageStats` (which contains an array of `UserLanguage`)
  - **Fields**:
    - `user_id` (ObjectID): Foreign key referencing the `_id` of the user.
    - `username` (string): User's username.
    - `languages` (array of objects): List of language statistics.
      - Each object (Go Model: `UserLanguage`) contains:
        - `id` (ObjectID): Unique identifier for the language stat entry.
        - `user_id` (ObjectID): User ID.
        - `username` (string): Username.
        - `language` (string): Name of the programming language.
        - `submission_count` (int): Total submissions in this language.
        - `accepted_count` (int): Accepted submissions in this language.
        - `percentage_of_total` (float64): Percentage of total submissions this language represents.
        - `last_used` (Date): Last time this language was used.
    - `total_submissions` (int): Total submissions across all languages for the user.
    - `last_updated_at` (Date): Timestamp of the last update to these statistics.

- **`user_skills_profiles` Collection**
  - **Purpose**: Stores a user's proficiency in various problem-solving skills/topics.
  - **Go Model**: `UserSkillsProfile` (which contains an array of `UserSkill`)
  - **Fields**:
    - `user_id` (ObjectID): Foreign key referencing the `_id` of the user.
    - `username` (string): User's username.
    - `skills` (array of objects): List of skill statistics.
      - Each object (Go Model: `UserSkill`) contains:
        - `id` (ObjectID): Unique identifier for the skill stat entry.
        - `user_id` (ObjectID): User ID.
        - `username` (string): Username.
        - `skill_name` (string): Name of the skill (e.g., "Dynamic Programming").
        - `level` (string): Proficiency level (e.g., "Beginner", "Advanced").
        - `problems_solved` (int): Number of problems solved related to this skill.
        - `easy_count` (int): Easy problems solved for this skill.
        - `medium_count` (int): Medium problems solved for this skill.
        - `hard_count` (int): Hard problems solved for this skill.
        - `last_practiced` (Date): Last time a problem with this skill was practiced.
    - `last_updated_at` (Date): Timestamp of the last update to this profile.

- **`comments` Collection**
  - **Purpose**: Stores comments made in discussion threads.
  - **Go Model**: `Comment`
  - **Fields**:
    - `_id` (ObjectID): Unique identifier for the comment.
    - `thread_id` (ObjectID): Foreign key referencing the `_id` of the associated thread.
    - `user_id` (ObjectID): Foreign key referencing the `_id` of the user who made the comment.
    - `content` (string): The content of the comment.
    - `upvotes` (int): Number of upvotes on the comment.
    - `downvotes` (int): Number of downvotes on the comment.
    - `created_at` (Date): Timestamp when the comment was created.
    - `updated_at` (Date): Timestamp of the last update to the comment.
    - `is_deleted` (boolean): Flag indicating if the comment has been soft-deleted.

- **`profiles` Collection**
  - **Purpose**: Stores additional user profile information.
  - **Go Model**: `Profile`
  - **Fields**:
    - `_id` (ObjectID): Unique identifier for the profile document.
    - `user_id` (ObjectID): Foreign key referencing the `_id` of the user.
    - `bio` (string, optional): User's biography.
    - `location` (string, optional): User's geographical location.
    - `website` (string, optional): User's personal website URL.

- **`votes` Collection**
  - **Purpose**: Stores user votes on threads or comments.
  - **Go Model**: `Vote`
  - **Fields**:
    - `_id` (ObjectID): Unique identifier for the vote record.
    - `user_id` (ObjectID): Foreign key referencing the `_id` of the user who voted.
    - `target_id` (ObjectID): ID of the thread or comment being voted on.
    - `type` (string): Type of target ("thread" or "comment").
    - `value` (int): Vote value (1 for upvote, -1 for downvote).
    - `created_at` (Date): Timestamp when the vote was cast.

- **`threads` Collection**
  - **Purpose**: Stores discussion threads for problems.
  - **Go Model**: `Thread`
  - **Fields**:
    - `_id` (ObjectID): Unique identifier for the thread.
    - `problem_id` (string): The problem ID this thread is associated with.
    - `user_id` (ObjectID): Foreign key referencing the `_id` of the user who created the thread.
    - `title` (string): Title of the discussion thread.
    - `content` (string): Main content/description of the thread.
    - `upvotes` (int): Number of upvotes on the thread.
    - `downvotes` (int): Number of downvotes on the thread.
    - `comment_count` (int): Cached count of comments in the thread.
    - `created_at` (Date): Timestamp when the thread was created.
    - `updated_at` (Date): Timestamp of the last update to the thread.
    - `is_locked` (boolean): Flag indicating if the thread is locked for new comments.

#### Admin Handlers (`handlers/problems.go`, `handlers/testcases.go`)
- **`CreateProblemHandler` (`/admin/problems`)**: An admin-only endpoint for adding new programming problems to the database. It expects a payload with problem details (title, statement, difficulty, limits, tags). The `Author` field for the problem is automatically set to the `Username` of the authenticated admin.
- **`AddTestCaseHandler` (`/admin/testcases`)**: This endpoint is protected by the `AdminAuthMiddleware`. It allows admin users to add new test cases (including sample test cases) to existing problems by referencing the `ProblemDBID`.

#### API Endpoints (Updated)
- **Authentication**:
  - `/register`: Create new user accounts
  - `/login`: Authenticate and receive JWT token
  - `/api/auth-status`: Check current authentication status
- **Problems**:
  - `/problems`: Get list of available coding problems (Cached for 5 minutes)
  - `/problems/{id}`: Get details of a specific problem (Cached for 5 minutes)
  - `/problems/{id}/stats`: Retrieve AI-powered time and memory complexity analysis for a problem (Cached for 5 minutes)
- **Execution & Submission**:
  - `/execute`: Execute user-submitted code with custom input
  - `/submit`: Submit solution for evaluation against test cases
  - `/submissions`: Get user's submission history (No cache)
  - `/submissions/{id}`: Get detailed submission results (No cache)
- **Admin**:
  - `/admin/problems` (POST): Create a new coding problem
  - `/admin/testcases` (POST): Add test cases to a problem
- **Editor Helper**:
  - `/last-code` (GET): Return the authenticated user's most recent code draft for a given `problem_id` (and optional `language`). Used by the frontend to restore editor state.
- **AI Features**:
  - `/convert-code` (POST): Convert pseudocode to Python code.

#### Configuration (`.env`)
The backend is configured using the following environment variables:
- `MONGO_URI`: The connection string for the MongoDB database.
- `JWT_SECRET_KEY`: A secret key for signing and verifying JWT tokens.
- `PORT`: The port on which the web server listens.

## Frontend (Next.js) 💻

### Technologies
- Next.js 15.x with Turbopack
- React 19
- TypeScript
- Tailwind CSS for styling
- Monaco Editor for the code editor

### Key Components

#### Problem Solving Page (`pages/problems/[problemId].tsx`)
This is the core feature of the frontend, providing an integrated environment for solving problems.
- **Data Fetching**: It uses the dynamic `problemId` from the URL to fetch problem details from the backend API (`/problems/:id`).
- **Code Editor**: Implements the **Monaco Editor** (`@monaco-editor/react`) to provide a high-quality coding experience with syntax highlighting and more.
- **Language Selection**: A dropdown allows the user to switch between supported languages (e.g., `javascript`, `python`).
- **Custom Test Cases**: Users can create and manage multiple test inputs to validate their solutions.
- **Code Execution**:
    - A "Run Code" button triggers a POST request to the `/execute` backend endpoint.
    - The request payload includes the code from the editor, the selected language, and any standard input.
    - Results appear in real-time in the output panel.
- **Code Submission**:
    - A "Submit" button sends the solution for evaluation against all test cases.
    - Redirects to the submission details page to see full results.
- **State Management**: Uses React hooks to manage component state, including the problem data, editor content, test cases, loading status, and execution results.

#### Submissions Page (`pages/submissions/index.tsx`)
- Displays a list of the user's submissions across all problems.
- Shows submission status, language, execution time, and submission date.
- Links to detailed submission results for each submission.

#### Submission Details Page (`pages/submissions/[id].tsx`)
- **Real-time Status Updates**: Implements polling to check submission status until a final result is available.
- **Detailed Results**:
  - Shows the submitted code with syntax highlighting.
  - Displays overall status with a color-coded indicator.
  - Shows test case results with expected and actual outputs.
  - Provides detailed error messages for failed submissions.
  - Shows performance metrics (execution time, memory usage).
- **Visual Indicators**: Uses icons and color-coding to clearly indicate status (accepted, wrong answer, runtime error, etc.).
- **Explanatory Messages**: Provides human-readable explanations of error types.

#### Admin Problem Creation Page (`pages/admin/problems/create.tsx`)
- This page provides a form for admin users to input details for a new coding problem.
- It captures fields such as `Problem ID`, `Title`, `Difficulty`, `Statement`, `Constraints`, `Time Limit`, `Memory Limit`, and `Tags`.
- Upon submission, it sends a POST request to the `/admin/problems` backend endpoint, including the `authToken` cookie for authentication.

#### Admin Test Case Addition Page (`pages/admin/problems/[problemId]/testcases/create.tsx`)
- This page allows admin users to add test cases to a specific problem.
- It dynamically fetches the problem details based on the `problemId` from the URL.
- The form collects `Input`, `Expected Output`, `Points`, `Sequence Number`, `Notes`, and an `Is Sample` checkbox.
- Submits the test case data via a POST request to the `/admin/testcases` backend endpoint, ensuring admin authorization.

## Development 🛠️

### Backend
```bash
# From the root directory
cd backend
go run cmd/server/main.go
```

### Admin User Creation Script ⚙️
- **Script Path**: `backend/cmd/admin/create_admin.go`
- **Purpose**: A standalone Go script to create a new user with administrative privileges directly in the MongoDB database, bypassing the regular registration flow.
- **Usage**: You can run this script from the root of the project to initialize an admin user.
    ```bash
    ./create_admin.sh <firstname> <lastname> <username> <password>
    ```
- **Helper Script**: `create_admin.sh` is a convenience wrapper to execute the Go script correctly.

### Frontend
```bash
# From the root directory
cd frontend
npm run dev
```

## Recent Improvements (June 2025) 📅

### Enhanced Code Execution System
- **Real Code Execution**: Replaced mock execution with actual code execution using appropriate language environments.
- **Micro-service Executors**: Introduced per-language Docker containers to sandbox code safely.
- **Improved Error Detection**: Added intelligent error classification for Python to distinguish between syntax errors and runtime errors.
- **Robust Output Capture**: Enhanced stdout and stderr capturing for more accurate feedback.

### Submission System Enhancements
- **Asynchronous Processing**: Implemented a queue-based processing system to handle submissions in the background.
- **File-Based Storage**: Organized submission files in a structured directory system for better traceability.
- **Detailed Test Case Results**: Improved reporting of test case outcomes with expected vs actual outputs.

### Error Classification Improvements
- **Intelligent Error Detection**: Added pattern recognition to classify Python errors more accurately.
- **User-Friendly Error Messages**: Enhanced error messages to provide more helpful feedback.
- **Visual Error Indicators**: Added icons and color-coding in the UI to make error types more distinguishable.

### UI Enhancements
- **Real-time Status Updates**: Added polling mechanism to submission details page.
- **Custom Test Case Management**: Added ability to create and manage multiple test inputs.
- **Enhanced Result Visualization**: Improved the display of submission results with better formatting and organization.
- **Persistent Editor Drafts**: Monaco editor now auto-restores code via `localStorage` and the new `/last-code` endpoint.
- **Select Component Fix**: Resolved an error in `frontend/src/pages/problems/index.tsx` where a `<SelectItem />` component had an empty string as its `value` prop, causing a React error. The fix involved changing the `value` of the "All Skills" `SelectItem` from an empty string to "all", and updating the associated state (`skillFilter`) initialization and filtering logic to correctly handle the new "all" value. This ensures the component adheres to the Radix UI `Select` component's requirement for non-empty string values.

### AI Features
- **Pseudocode Support**: Allows users to write pseudocode which is then converted to Python for execution and evaluation.
- **AI Complexity Analysis**: Provides AI-powered time and memory complexity analysis for submitted solutions.
- **AI Code Completion**: (New) Provides intelligent code completion suggestions. This feature is backed by a new MongoDB-based caching layer to ensure fast response times and reduce API costs.
