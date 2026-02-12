import { z } from 'zod';

/**
 * Login form validation schema
 */
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * API response types
 */
interface LoginSuccessResponse {
  success: true;
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

interface LoginErrorResponse {
  success: false;
  error: string;
  code?: string;
}

type LoginResponse = LoginSuccessResponse | LoginErrorResponse;

/**
 * Configuration for API endpoints
 */
const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
  endpoints: {
    login: '/auth/login',
  },
  timeout: 30000,
};

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Validates login form data against schema
 * @param data - Raw form data to validate
 * @returns Validated form data
 * @throws {z.ZodError} If validation fails
 */
export function validateLoginForm(data: unknown): LoginFormData {
  return loginSchema.parse(data);
}

/**
 * Validates individual form field
 * @param field - Field name to validate
 * @param value - Field value to validate
 * @returns Validation result with error message if invalid
 */
export function validateField(
  field: keyof LoginFormData,
  value: string
): { valid: boolean; error?: string } {
  try {
    loginSchema.shape[field].parse(value);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0]?.message };
    }
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Makes authenticated API call to Lambda backend
 * @param endpoint - API endpoint path
 * @param data - Request payload
 * @param options - Additional fetch options
 * @returns API response
 * @throws {ApiError} If request fails
 */
async function apiCall<T>(
  endpoint: string,
  data: unknown,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  try {
    const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error || `HTTP error ${response.status}`,
        response.status,
        errorData.code
      );
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408, 'TIMEOUT');
      }
      throw new ApiError(error.message, undefined, 'NETWORK_ERROR');
    }

    throw new ApiError('An unexpected error occurred', undefined, 'UNKNOWN_ERROR');
  }
}

/**
 * Authenticates user with email and password
 * @param credentials - User login credentials
 * @returns Login response with token and user data
 * @throws {ApiError} If login fails
 */
export async function login(credentials: LoginFormData): Promise<LoginSuccessResponse> {
  try {
    // Validate credentials before sending
    const validatedData = validateLoginForm(credentials);

    const response = await apiCall<LoginResponse>(
      API_CONFIG.endpoints.login,
      validatedData
    );

    if (!response.success) {
      throw new ApiError(
        response.error || 'Login failed',
        401,
        response.code || 'LOGIN_FAILED'
      );
    }

    // Store token in sessionStorage
    if (typeof window !== 'undefined' && response.token) {
      sessionStorage.setItem('auth_token', response.token);
      sessionStorage.setItem('user', JSON.stringify(response.user));
    }

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError(
        error.errors[0]?.message || 'Validation failed',
        400,
        'VALIDATION_ERROR'
      );
    }
    throw error;
  }
}

/**
 * Logs out current user and clears session data
 */
export function logout(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user');
  }
}

/**
 * Checks if user is currently authenticated
 * @returns True if user has valid session
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const token = sessionStorage.getItem('auth_token');
  return !!token;
}

/**
 * Gets current authentication token
 * @returns Auth token or null if not authenticated
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return sessionStorage.getItem('auth_token');
}

/**
 * Gets current user data from session
 * @returns User data or null if not authenticated
 */
export function getCurrentUser(): LoginSuccessResponse['user'] | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const userStr = sessionStorage.getItem('user');
  if (!userStr) {
    return null;
  }
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Formats API error for display to user
 * @param error - Error object
 * @returns User-friendly error message
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'TIMEOUT':
        return 'Request timed out. Please try again.';
      case 'NETWORK_ERROR':
        return 'Network error. Please check your connection.';
      case 'VALIDATION_ERROR':
        return error.message;
      case 'LOGIN_FAILED':
        return 'Invalid email or password.';
      default:
        return error.message || 'An error occurred. Please try again.';
    }
  }

  if (error instanceof z.ZodError) {
    return error.errors[0]?.message || 'Validation failed';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Handles form submission with validation and error handling
 * @param formData - Form data to submit
 * @param onSuccess - Callback on successful login
 * @param onError - Callback on error
 */
export async function handleLoginSubmit(
  formData: LoginFormData,
  onSuccess?: (response: LoginSuccessResponse) => void,
  onError?: (error: string) => void
): Promise<void> {
  try {
    const response = await login(formData);
    onSuccess?.(response);
  } catch (error) {
    const errorMessage = formatErrorMessage(error);
    onError?.(errorMessage);
  }
}

/**
 * Initializes login form with event listeners
 * @param formElement - Form DOM element
 * @param options - Configuration options
 */
export function initializeLoginForm(
  formElement: HTMLFormElement,
  options: {
    onSuccess?: (response: LoginSuccessResponse) => void;
    onError?: (error: string) => void;
    onValidationError?: (field: string, error: string) => void;
  } = {}
): void {
  if (!formElement) {
    throw new Error('Form element is required');
  }

  formElement.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(formElement);
    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };

    await handleLoginSubmit(data, options.onSuccess, options.onError);
  });

  // Add real-time validation
  const emailInput = formElement.querySelector<HTMLInputElement>('[name="email"]');
  const passwordInput = formElement.querySelector<HTMLInputElement>('[name="password"]');

  if (emailInput) {
    emailInput.addEventListener('blur', () => {
      const result = validateField('email', emailInput.value);
      if (!result.valid && result.error) {
        options.onValidationError?.('email', result.error);
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener('blur', () => {
      const result = validateField('password', passwordInput.value);
      if (!result.valid && result.error) {
        options.onValidationError?.('password', result.error);
      }
    });
  }
}

export { loginSchema };
```