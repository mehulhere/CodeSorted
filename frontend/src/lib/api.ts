import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

const BASE_URL = 'http://localhost:8080';

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

export const post = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  return apiRequest<T>({ ...config, method: 'POST', url, data });
};

export const put = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  return apiRequest<T>({ ...config, method: 'PUT', url, data });
};

export const del = <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  return apiRequest<T>({ ...config, method: 'DELETE', url });
};

// Specialized API functions
export const executeCode = async (language: string, code: string, testCases: string[]) => {
  return post('/execute', { language, code, testCases });
};

export const submitSolution = async (problemId: string, language: string, code: string) => {
  return post('/submit', { problem_id: problemId, language, code });
};

export const convertPseudocode = async (pseudocode: string) => {
  return post('/convert-code', { pseudocode });
};

export const getCodeCompletion = async (prefix: string, currentLine: string, language: string) => {
  return post('/autocomplete', { prefix, currentLine, language });
};

export const getRateLimits = async () => {
  return get('/api/rate-limits');
};

export const logout = async () => {
  try {
    await post('/logout');
    // Also clear the cookie client-side
    document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost; secure; samesite=none;';
    return { success: true };
  } catch (error) {
    console.error('Error during logout:', error);
    // Even if the server call fails, clear the cookie
    document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost; secure; samesite=none;';
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

export default api; 