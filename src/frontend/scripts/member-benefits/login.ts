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

/**
 * Type definition for login form data
 */
export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * API response type for login endpoint
 */
interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

/**
 * API error response type
 */
interface ApiError {
  error: string;
  message: string;
  statusCode?: number;
}

/**
 * Configuration for API endpoint
 */
const API_CONFIG = {
  endpoint: process.env.NEXT_PUBLIC_MEMBER_BENEFITS_API_ENDPOINT || '/api/member-benefits/login',
  timeout: 30000,
};

/**
 * Validates login form data against the schema
 * 
 * @param data - The form data to validate
 * @returns Validation result with parsed data or errors
 */
export function validateLoginForm(data: unknown): {
  success: boolean;
  data?: LoginFormData;
  errors?: Record<string, string[]>;
} {
  try {
    const parsed = loginSchema.parse(data);
    return {
      success: true,
      data: parsed,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      return {
        success: false,
        errors,
      };
    }
    return {
      success: false,
      errors: { _form: ['An unexpected validation error occurred'] },
    };
  }
}

/**
 * Calls the Lambda login endpoint with the provided credentials
 * 
 * @param credentials - User login credentials
 * @returns Promise resolving to login response
 * @throws Error if the API call fails
 */
export async function loginUser(credentials: LoginFormData): Promise<LoginResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  try {
    const response = await fetch(API_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: 'An unexpected error occurred',
        statusCode: response.status,
      }));

      throw new Error(errorData.message || `Login failed with status ${response.status}`);
    }

    const data: LoginResponse = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    }

    throw new Error('An unexpected error occurred during login');
  }
}

/**
 * Handles the complete login flow including validation and API call
 * 
 * @param formData - Raw form data from the login form
 * @returns Promise resolving to login result with success status and data or errors
 */
export async function handleLogin(formData: unknown): Promise<{
  success: boolean;
  data?: LoginResponse;
  errors?: Record<string, string[]>;
}> {
  // Validate form data
  const validation = validateLoginForm(formData);
  
  if (!validation.success) {
    return {
      success: false,
      errors: validation.errors,
    };
  }

  try {
    // Call login API
    const response = await loginUser(validation.data!);

    if (response.success && response.token) {
      // Store token in localStorage
      storeAuthToken(response.token);
      
      // Store user data if available
      if (response.user) {
        storeUserData(response.user);
      }

      return {
        success: true,
        data: response,
      };
    }

    return {
      success: false,
      errors: {
        _form: [response.message || 'Login failed. Please try again.'],
      },
    };
  } catch (error) {
    return {
      success: false,
      errors: {
        _form: [error instanceof Error ? error.message : 'An unexpected error occurred'],
      },
    };
  }
}

/**
 * Stores authentication token in localStorage
 * 
 * @param token - JWT or session token
 */
export function storeAuthToken(token: string): void {
  try {
    localStorage.setItem('member_benefits_auth_token', token);
  } catch (error) {
    console.error('Failed to store auth token:', error);
  }
}

/**
 * Retrieves authentication token from localStorage
 * 
 * @returns The stored token or null if not found
 */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('member_benefits_auth_token');
  } catch (error) {
    console.error('Failed to retrieve auth token:', error);
    return null;
  }
}

/**
 * Removes authentication token from localStorage
 */
export function clearAuthToken(): void {
  try {
    localStorage.removeItem('member_benefits_auth_token');
  } catch (error) {
    console.error('Failed to clear auth token:', error);
  }
}

/**
 * Stores user data in localStorage
 * 
 * @param user - User data object
 */
export function storeUserData(user: LoginResponse['user']): void {
  try {
    localStorage.setItem('member_benefits_user', JSON.stringify(user));
  } catch (error) {
    console.error('Failed to store user data:', error);
  }
}

/**
 * Retrieves user data from localStorage
 * 
 * @returns The stored user data or null if not found
 */
export function getUserData(): LoginResponse['user'] | null {
  try {
    const data = localStorage.getItem('member_benefits_user');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to retrieve user data:', error);
    return null;
  }
}

/**
 * Clears all authentication data from localStorage
 */
export function logout(): void {
  clearAuthToken();
  try {
    localStorage.removeItem('member_benefits_user');
  } catch (error) {
    console.error('Failed to clear user data:', error);
  }
}

/**
 * Checks if user is currently authenticated
 * 
 * @returns True if user has a valid token
 */
export function isAuthenticated(): boolean {
  const token = getAuthToken();
  return token !== null && token.length > 0;
}

/**
 * Sanitizes email input to prevent XSS attacks
 * 
 * @param email - Raw email input
 * @returns Sanitized email string
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Displays form field error
 * 
 * @param fieldId - ID of the form field
 * @param errors - Array of error messages
 */
export function displayFieldError(fieldId: string, errors: string[]): void {
  const field = document.getElementById(fieldId);
  const errorContainer = document.getElementById(`${fieldId}-error`);

  if (field) {
    field.classList.add('border-red-500');
    field.setAttribute('aria-invalid', 'true');
  }

  if (errorContainer) {
    errorContainer.textContent = errors[0];
    errorContainer.classList.remove('hidden');
  }
}

/**
 * Clears form field error
 * 
 * @param fieldId - ID of the form field
 */
export function clearFieldError(fieldId: string): void {
  const field = document.getElementById(fieldId);
  const errorContainer = document.getElementById(`${fieldId}-error`);

  if (field) {
    field.classList.remove('border-red-500');
    field.removeAttribute('aria-invalid');
  }

  if (errorContainer) {
    errorContainer.textContent = '';
    errorContainer.classList.add('hidden');
  }
}

/**
 * Clears all form errors
 * 
 * @param fieldIds - Array of field IDs to clear
 */
export function clearAllErrors(fieldIds: string[]): void {
  fieldIds.forEach((fieldId) => clearFieldError(fieldId));
}

/**
 * Displays general form error message
 * 
 * @param message - Error message to display
 */
export function displayFormError(message: string): void {
  const errorContainer = document.getElementById('form-error');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.classList.remove('hidden');
  }
}

/**
 * Clears general form error message
 */
export function clearFormError(): void {
  const errorContainer = document.getElementById('form-error');
  if (errorContainer) {
    errorContainer.textContent = '';
    errorContainer.classList.add('hidden');
  }
}
```