/**
 * Base HTTP client avec gestion des erreurs et retry
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface RequestOptions extends RequestInit {
  retry?: number;
  retryDelay?: number;
}

class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Sleep utility for retry delay
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Base fetch with error handling and retry
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    retry = 0,
    retryDelay = 1000,
    headers = {},
    ...fetchOptions
  } = options;

  const token = localStorage.getItem('token');
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...headers,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: defaultHeaders,
      });

      // Handle non-2xx responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      // Parse JSON response
      const data = await response.json();
      return data;

    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx)
      if (error instanceof APIError && error.status && error.status < 500) {
        throw error;
      }

      // Retry on network errors and 5xx errors
      if (attempt < retry) {
        console.warn(`Request failed (attempt ${attempt + 1}/${retry + 1}), retrying...`);
        await sleep(retryDelay * Math.pow(2, attempt)); // Exponential backoff
        continue;
      }
    }
  }

  throw lastError;
}

/**
 * Convenience methods
 */
export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),

  // Special method for file uploads
  upload: async <T = any>(endpoint: string, formData: FormData, options?: RequestOptions) => {
    const token = localStorage.getItem('token');
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return response.json() as Promise<T>;
  },
};

export { APIError };
