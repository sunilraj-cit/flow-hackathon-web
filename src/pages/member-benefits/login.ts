import { z } from 'zod';

/**
 * Login form validation schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(1, { message: 'Password is required' })
    .min(8, { message: 'Password must be at least 8 characters' }),
  rememberMe: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * API response types
 */
export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  message?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

/**
 * Custom error class for login-related errors
 */
export class LoginError extends Error {
  public readonly code?: string;
  public readonly statusCode?: number;

  constructor(message: string, code?: string, statusCode?: number) {
    super(message);
    this.name = 'LoginError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, LoginError.prototype);
  }
}

/**
 * Validates login form data against the schema
 * @param data - The form data to validate
 * @returns Validation result with parsed data or errors
 */
export function validateLoginForm(data: unknown): {
  success: boolean;
  data?: LoginFormData;
  errors?: z.ZodError;
} {
  try {
    const validatedData = loginSchema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Formats Zod validation errors into a user-friendly format
 * @param errors - Zod validation errors
 * @returns Object mapping field names to error messages
 */
export function formatValidationErrors(
  errors: z.ZodError
): Record<string, string> {
  const formattedErrors: Record<string, string> = {};
  errors.errors.forEach((error) => {
    const path = error.path.join('.');
    formattedErrors[path] = error.message;
  });
  return formattedErrors;
}

/**
 * Performs login API call
 * @param credentials - User login credentials
 * @returns Promise resolving to login response
 * @throws {LoginError} When login fails
 */
export async function loginUser(
  credentials: LoginFormData
): Promise<LoginResponse> {
  try {
    const response = await fetch('/api/member-benefits/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        rememberMe: credentials.rememberMe,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new LoginError(
        data.message || 'Login failed',
        data.code,
        response.status
      );
    }

    return data;
  } catch (error) {
    if (error instanceof LoginError) {
      throw error;
    }

    if (error instanceof TypeError) {
      throw new LoginError(
        'Network error. Please check your connection.',
        'NETWORK_ERROR',
        0
      );
    }

    throw new LoginError(
      'An unexpected error occurred. Please try again.',
      'UNKNOWN_ERROR',
      500
    );
  }
}

/**
 * Stores authentication token in local storage or session storage
 * @param token - JWT or session token
 * @param rememberMe - Whether to persist the token
 */
export function storeAuthToken(token: string, rememberMe: boolean = false): void {
  try {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('auth_token', token);
    storage.setItem('auth_timestamp', Date.now().toString());
  } catch (error) {
    console.error('Failed to store auth token:', error);
  }
}

/**
 * Retrieves authentication token from storage
 * @returns The stored token or null if not found
 */
export function getAuthToken(): string | null {
  try {
    return (
      localStorage.getItem('auth_token') ||
      sessionStorage.getItem('auth_token')
    );
  } catch (error) {
    console.error('Failed to retrieve auth token:', error);
    return null;
  }
}

/**
 * Removes authentication token from storage
 */
export function clearAuthToken(): void {
  try {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_timestamp');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_timestamp');
  } catch (error) {
    console.error('Failed to clear auth token:', error);
  }
}

/**
 * Checks if user is authenticated
 * @returns True if user has a valid token
 */
export function isAuthenticated(): boolean {
  const token = getAuthToken();
  return token !== null && token.length > 0;
}

/**
 * Handles the complete login flow
 * @param formData - Login form data
 * @returns Promise resolving to login response
 * @throws {LoginError} When login fails
 */
export async function handleLogin(
  formData: LoginFormData
): Promise<LoginResponse> {
  // Validate form data
  const validation = validateLoginForm(formData);
  if (!validation.success) {
    const errors = formatValidationErrors(validation.errors!);
    const firstError = Object.values(errors)[0];
    throw new LoginError(firstError, 'VALIDATION_ERROR', 400);
  }

  // Perform login
  const response = await loginUser(validation.data!);

  // Store token if login successful
  if (response.success && response.token) {
    storeAuthToken(response.token, formData.rememberMe || false);
  }

  return response;
}

/**
 * Handles logout functionality
 * @returns Promise that resolves when logout is complete
 */
export async function handleLogout(): Promise<void> {
  try {
    // Call logout API endpoint
    await fetch('/api/member-benefits/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });
  } catch (error) {
    console.error('Logout API call failed:', error);
  } finally {
    // Always clear local token
    clearAuthToken();
  }
}

/**
 * Sanitizes user input to prevent XSS attacks
 * @param input - Raw user input
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 255);
}

/**
 * Handles API errors and returns user-friendly messages
 * @param error - Error object
 * @returns User-friendly error message
 */
export function handleApiError(error: unknown): string {
  if (error instanceof LoginError) {
    switch (error.statusCode) {
      case 401:
        return 'Invalid email or password. Please try again.';
      case 403:
        return 'Your account has been locked. Please contact support.';
      case 429:
        return 'Too many login attempts. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Debounces a function call
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Redirects user to member benefits dashboard after successful login
 * @param redirectUrl - Optional custom redirect URL
 */
export function redirectToDashboard(redirectUrl?: string): void {
  const url = redirectUrl || '/member-benefits/dashboard';
  if (typeof window !== 'undefined') {
    window.location.href = url;
  }
}

/**
 * Gets redirect URL from query parameters
 * @returns Redirect URL or null
 */
export function getRedirectUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');

  // Validate redirect URL to prevent open redirect vulnerabilities
  if (redirect && redirect.startsWith('/')) {
    return redirect;
  }

  return null;
}