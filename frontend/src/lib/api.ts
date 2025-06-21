import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

const BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL}`;

export interface ApiErrorResponse {
  message: string;
  status?: number;
  resetTime?: string;
  service?: string;
}

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Define types for rate limit information
interface RateLimitInfo {
  service: string;
  limit: number;
  remaining: number;
  resetTime: Date;
}

// Create a handler for rate limit error notifications
export let onRateLimitError: (error: ApiErrorResponse) => void = () => {};

// Function to set the rate limit error handler
export const setRateLimitErrorHandler = (handler: (error: ApiErrorResponse) => void) => {
  onRateLimitError = handler;
};

// Function to extract rate limit info from headers
const extractRateLimitInfo = (headers: Record<string, string>): RateLimitInfo | null => {
  const limit = headers['x-ratelimit-limit'];
  const remaining = headers['x-ratelimit-remaining'];
  const resetTime = headers['x-ratelimit-reset'];
  const service = headers['x-ratelimit-service'] || 'unknown'; // Some servers might not provide this

  if (limit && remaining && resetTime) {
    return {
      service,
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      resetTime: new Date(resetTime),
    };
  }
  return null;
};

// Interceptor to handle response and extract rate limit headers
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Extract and log rate limit info if present
    const rateLimitInfo = extractRateLimitInfo(response.headers as Record<string, string>);
    if (rateLimitInfo) {
      console.debug('Rate limit info:', rateLimitInfo);
    }
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      // Handle rate limit exceeded (HTTP 429)
      if (error.response.status === 429) {
        const errorResponse = error.response.data as ApiErrorResponse;
        const headers = error.response.headers as Record<string, string>;
        const resetTime = headers['x-ratelimit-reset'];
        
        const errorInfo: ApiErrorResponse = {
          message: errorResponse.message || 'Rate limit exceeded. Please try again later.',
          status: error.response.status,
          resetTime,
          service: headers['x-ratelimit-service'] || undefined,
        };
        
        // Call the rate limit error handler
        onRateLimitError(errorInfo);
        
        // Return a rejected promise with the error info
        return Promise.reject(errorInfo);
      }
    }
    return Promise.reject(error);
  }
);

// Generic request function
export const apiRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
  try {
    const response = await api(config);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Format and rethrow the error
      const apiError: ApiErrorResponse = {
        message: error.response?.data?.message || error.message,
        status: error.response?.status,
      };
      throw apiError;
    }
    throw error;
  }
};

// Helper methods for common HTTP methods
export const get = <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  return apiRequest<T>({ ...config, method: 'GET', url });
};

export const post = <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
  return apiRequest<T>({ ...config, method: 'POST', url, data });
};

export const put = <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
  return apiRequest<T>({ ...config, method: 'PUT', url, data });
};

export const del = <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  return apiRequest<T>({ ...config, method: 'DELETE', url });
};

// Specialized API functions

/**
 * Executes code with the provided test cases
 * @param language The programming language to use (python, javascript, cpp, java)
 * @param code The user's code
 * @param testCases Array of test case input strings
 * @param problemId Optional problem ID for context
 * @returns Results of code execution
 */
export async function executeCode(
    language: string,
    code: string,
    testCases: string[],
    problemId?: string
) {
    return post('/execute', { language, code, testCases, problemId });
}

/**
 * Submits a solution for evaluation
 * @param problemId The ID of the problem
 * @param language The programming language
 * @param code The user's code
 * @returns Submission confirmation
 */
export const submitSolution = async (problemId: string, language: string, code: string) => {
  return post('/submit', { problem_id: problemId, language, code });
};

export const convertPseudocode = async (pseudocode: string) => {
  return post('/convert-code', { pseudocode });
};

export const getCodeCompletion = async (
  prefix: string, 
  currentLine: string, 
  language: string, 
  problemName?: string, 
  sampleTestCase?: { input: string, expected_output: string }
) => {
  return post('/autocomplete', { 
    prefix, 
    currentLine, 
    language, 
    problemName, 
    sampleTestCase 
  });
};

export const getAIHint = async (problemStatement: string, code: string, language: string) => {
  return post('/api/ai-hint', { problem_statement: problemStatement, code, language });
};

export const getRateLimits = async () => {
  return get('/api/rate-limits');
};

export const logout = async () => {
  try {
    await post('/logout');
    // Also clear the cookie client-side
    document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=none;';
    return { success: true };
  } catch (error) {
    console.error('Error during logout:', error);
    // Even if the server call fails, clear the cookie
    document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=none;';
    throw error;
  }
};

// Add this interface for auth status response
interface AuthStatusResponse {
  isLoggedIn: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    firstname: string;
    lastname: string;
    isAdmin: boolean;
  };
}

// Add this to the specialized API functions section
export const getAuthStatus = async (): Promise<AuthStatusResponse> => {
  return get('/api/auth-status');
};

// Add guest login function
export const guestLogin = async (): Promise<AuthStatusResponse> => {
  return post('/guest-login');
};

// New functions for problem creation and test cases
export const createProblem = async (problemData: any) => {
  return post('/admin/problems', problemData);
};

/**
 * Generates test cases for a problem
 * @param problemDetails The details of the problem
 * @returns A map of test cases
 */
export async function generateTestCases(problemDetails: ProblemDetails) {
    const problemStatement = problemDetails.formatted_statement;
    const problemId = problemDetails.problem_id;
    const problemTitle = problemDetails.title;

    return post('/api/generate-testcases', {
        problem_statement: problemStatement,
        problem_id: problemId,
        problem_title: problemTitle,
        problem_details: problemDetails,
    });
}

/**
 * Adds a bulk of test cases to a problem
 * @param problemId The ID of the problem
 * @param testCases Array of test cases
 * @param sampleCount The number of sample test cases
 * @returns Confirmation of bulk test case addition
 */
export const bulkAddTestCases = async (problemId: string, testCases: any, sampleCount: number) => {
  return post('/api/bulk-add-testcases', {
    problem_db_id: problemId,
    test_cases: testCases,
    sample_count: sampleCount
  });
};

// New function for generating problem details
export interface ProblemDetails {
  title: string;
  formatted_statement: string;
  difficulty: string;
  constraints: string;
  tags: string[];
  problem_id: string;
}

export const generateProblemDetails = async (rawStatement: string) => {
  const response = await api.post('/api/generate-problem-details', { raw_problem_statement: rawStatement });
  return response.data as ProblemDetails;
};

// Functions for generating brute force solutions and expected outputs
export const generateBruteForceSolution = async (problemStatement: string, language: string = 'python') => {
  return post('/api/generate-brute-force-solution', { problem_statement: problemStatement, language });
};

export const generateExpectedOutputs = async (problemStatement: string, testCases: any, language: string = 'python') => {
  return post('/api/generate-expected-outputs', { problem_statement: problemStatement, test_cases: testCases, language });
};

export default api; 