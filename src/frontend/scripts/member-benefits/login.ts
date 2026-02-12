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
  userId: string;
  redirectUrl?: string;
}

interface LoginErrorResponse {
  success: false;
  error: string;
  message: string;
}

type LoginResponse = LoginSuccessResponse | LoginErrorResponse;

/**
 * Configuration for API endpoints
 */
const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
  endpoints: {
    login: '/member-benefits/login',
  },
  timeout: 30000,
};

/**
 * Custom error class for login-related errors
 */
export class LoginError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'LoginError';
  }
}

/**
 * Validates login form data against the schema
 * 
 * @param data - Raw form data to validate
 * @returns Validated form data
 * @throws {z.ZodError} If validation fails
 */
export function validateLoginForm(data: unknown): LoginFormData {
  return loginSchema.parse(data);
}

/**
 * Validates a single form field
 * 
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
    return { valid: false, error: 'Validation failed' };
  }
}

/**
 * Makes an API call to the Lambda backend for login
 * 
 * @param credentials - User login credentials
 * @returns Promise resolving to login response
 * @throws {LoginError} If the API call fails
 */
export async function loginUser(
  credentials: LoginFormData
): Promise<LoginSuccessResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  try {
    const response = await fetch(
      `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.login}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData: LoginErrorResponse = await response.json().catch(() => ({
        success: false,
        error: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      }));

      throw new LoginError(
        errorData.message || 'Login failed',
        errorData.error,
        response.status
      );
    }

    const data: LoginResponse = await response.json();

    if (!data.success) {
      throw new LoginError(
        data.message || 'Login failed',
        data.error,
        response.status
      );
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof LoginError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new LoginError('Request timeout. Please try again.', 'TIMEOUT');
      }

      if (error.message.includes('fetch')) {
        throw new LoginError(
          'Network error. Please check your connection.',
          'NETWORK_ERROR'
        );
      }
    }

    throw new LoginError(
      'An unexpected error occurred. Please try again.',
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Stores authentication token in localStorage
 * 
 * @param token - JWT token to store
 */
export function storeAuthToken(token: string): void {
  try {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_token_timestamp', Date.now().toString());
  } catch (error) {
    console.error('Failed to store auth token:', error);
  }
}

/**
 * Stores user ID in localStorage
 * 
 * @param userId - User ID to store
 */
export function storeUserId(userId: string): void {
  try {
    localStorage.setItem('user_id', userId);
  } catch (error) {
    console.error('Failed to store user ID:', error);
  }
}

/**
 * Redirects user to specified URL or default dashboard
 * 
 * @param redirectUrl - Optional custom redirect URL
 */
export function redirectAfterLogin(redirectUrl?: string): void {
  const defaultRedirect = '/member-benefits/dashboard';
  const targetUrl = redirectUrl || defaultRedirect;

  // Check if there's a return URL in query params
  const urlParams = new URLSearchParams(window.location.search);
  const returnUrl = urlParams.get('returnUrl');

  if (returnUrl && isValidRedirectUrl(returnUrl)) {
    window.location.href = returnUrl;
  } else {
    window.location.href = targetUrl;
  }
}

/**
 * Validates if a redirect URL is safe (prevents open redirect vulnerabilities)
 * 
 * @param url - URL to validate
 * @returns True if URL is safe for redirect
 */
function isValidRedirectUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    return parsedUrl.origin === window.location.origin;
  } catch {
    return url.startsWith('/') && !url.startsWith('//');
  }
}

/**
 * Handles the complete login flow
 * 
 * @param formData - Login form data
 * @returns Promise resolving when login is complete
 * @throws {LoginError} If login fails
 */
export async function handleLogin(formData: LoginFormData): Promise<void> {
  // Validate form data
  const validatedData = validateLoginForm(formData);

  // Call login API
  const response = await loginUser(validatedData);

  // Store authentication data
  storeAuthToken(response.token);
  storeUserId(response.userId);

  // Redirect user
  redirectAfterLogin(response.redirectUrl);
}

/**
 * Gets user-friendly error message from LoginError
 * 
 * @param error - Error object
 * @returns User-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof LoginError) {
    return error.message;
  }

  if (error instanceof z.ZodError) {
    const firstError = error.errors[0];
    return firstError?.message || 'Validation failed';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Clears any existing authentication data
 */
export function clearAuthData(): void {
  try {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_token_timestamp');
    localStorage.removeItem('user_id');
  } catch (error) {
    console.error('Failed to clear auth data:', error);
  }
}

/**
 * Initializes the login form with event listeners and validation
 * 
 * @param formElement - The login form element
 * @param onSuccess - Optional callback on successful login
 * @param onError - Optional callback on login error
 */
export function initializeLoginForm(
  formElement: HTMLFormElement,
  onSuccess?: () => void,
  onError?: (error: string) => void
): void {
  const emailInput = formElement.querySelector<HTMLInputElement>('#email');
  const passwordInput = formElement.querySelector<HTMLInputElement>('#password');
  const submitButton = formElement.querySelector<HTMLButtonElement>('[type="submit"]');

  if (!emailInput || !passwordInput || !submitButton) {
    console.error('Required form elements not found');
    return;
  }

  // Real-time validation
  emailInput.addEventListener('blur', () => {
    const result = validateField('email', emailInput.value);
    updateFieldError(emailInput, result.error);
  });

  passwordInput.addEventListener('blur', () => {
    const result = validateField('password', passwordInput.value);
    updateFieldError(passwordInput, result.error);
  });

  // Form submission
  formElement.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData: LoginFormData = {
      email: emailInput.value.trim(),
      password: passwordInput.value,
    };

    // Disable submit button during processing
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in...';

    try {
      await handleLogin(formData);
      onSuccess?.();
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      onError?.(errorMessage);
      console.error('Login failed:', error);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Log In';
    }
  });
}

/**
 * Updates field error display
 * 
 * @param input - Input element
 * @param error - Error message or undefined
 */
function updateFieldError(input: HTMLInputElement, error?: string): void {
  const errorElement = input.parentElement?.querySelector('.error-message');

  if (error) {
    input.classList.add('error');
    input.setAttribute('aria-invalid', 'true');

    if (errorElement) {
      errorElement.textContent = error;
    }
  } else {
    input.classList.remove('error');
    input.removeAttribute('aria-invalid');

    if (errorElement) {
      errorElement.textContent = '';
    }
  }
}