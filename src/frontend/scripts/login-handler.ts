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
 * Type definition for authentication response
 */
export interface AuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  message?: string;
  error?: string;
}

/**
 * Type definition for validation errors
 */
export interface ValidationErrors {
  email?: string;
  password?: string;
}

/**
 * Configuration for the authentication API
 */
interface AuthConfig {
  apiEndpoint: string;
  timeout?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AuthConfig = {
  apiEndpoint: process.env.NEXT_PUBLIC_AUTH_API_ENDPOINT || '/api/auth/login',
  timeout: 30000,
};

/**
 * Custom error class for authentication errors
 */
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Validates login form data against the schema
 * 
 * @param data - The form data to validate
 * @returns Validation result with parsed data or errors
 */
export function validateLoginForm(data: unknown): {
  success: boolean;
  data?: LoginFormData;
  errors?: ValidationErrors;
} {
  try {
    const validatedData = loginSchema.parse(data);
    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationErrors = {};
      error.errors.forEach((err) => {
        const field = err.path[0] as keyof ValidationErrors;
        if (field) {
          errors[field] = err.message;
        }
      });
      return {
        success: false,
        errors,
      };
    }
    return {
      success: false,
      errors: {
        email: 'Validation failed',
      },
    };
  }
}

/**
 * Calls the authentication Lambda API to authenticate user
 * 
 * @param credentials - User login credentials
 * @param config - Optional configuration for the API call
 * @returns Authentication response with token and user data
 * @throws {AuthenticationError} When authentication fails
 */
export async function authenticateUser(
  credentials: LoginFormData,
  config: Partial<AuthConfig> = {}
): Promise<AuthResponse> {
  const { apiEndpoint, timeout } = { ...DEFAULT_CONFIG, ...config };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      throw new AuthenticationError(
        data.message || data.error || 'Authentication failed',
        response.status,
        data
      );
    }

    return {
      success: true,
      token: data.token,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      message: data.message,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof AuthenticationError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new AuthenticationError('Request timeout', 408);
      }
      throw new AuthenticationError(
        'Network error occurred. Please check your connection.',
        0,
        error
      );
    }

    throw new AuthenticationError('An unexpected error occurred');
  }
}

/**
 * Stores authentication token in browser storage
 * 
 * @param token - JWT token to store
 * @param refreshToken - Optional refresh token
 * @param expiresIn - Token expiration time in seconds
 */
export function storeAuthToken(
  token: string,
  refreshToken?: string,
  expiresIn?: number
): void {
  try {
    localStorage.setItem('auth_token', token);
    
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    
    if (expiresIn) {
      const expirationTime = Date.now() + expiresIn * 1000;
      localStorage.setItem('token_expiration', expirationTime.toString());
    }
  } catch (error) {
    console.error('Failed to store authentication token:', error);
  }
}

/**
 * Retrieves authentication token from browser storage
 * 
 * @returns The stored authentication token or null
 */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('auth_token');
  } catch (error) {
    console.error('Failed to retrieve authentication token:', error);
    return null;
  }
}

/**
 * Checks if the stored authentication token is expired
 * 
 * @returns True if token is expired or not found
 */
export function isTokenExpired(): boolean {
  try {
    const expirationTime = localStorage.getItem('token_expiration');
    if (!expirationTime) {
      return true;
    }
    return Date.now() >= parseInt(expirationTime, 10);
  } catch (error) {
    console.error('Failed to check token expiration:', error);
    return true;
  }
}

/**
 * Clears all authentication data from browser storage
 */
export function clearAuthData(): void {
  try {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expiration');
  } catch (error) {
    console.error('Failed to clear authentication data:', error);
  }
}

/**
 * Main handler for login form submission
 * 
 * @param formData - The form data from the login form
 * @param config - Optional configuration for the API call
 * @returns Authentication response
 * @throws {AuthenticationError} When authentication fails
 */
export async function handleLogin(
  formData: unknown,
  config?: Partial<AuthConfig>
): Promise<AuthResponse> {
  // Validate form data
  const validation = validateLoginForm(formData);
  
  if (!validation.success || !validation.data) {
    throw new AuthenticationError(
      'Invalid form data',
      400,
      validation.errors
    );
  }

  // Authenticate user
  const authResponse = await authenticateUser(validation.data, config);

  // Store authentication token
  if (authResponse.success && authResponse.token) {
    storeAuthToken(
      authResponse.token,
      authResponse.refreshToken,
      authResponse.expiresIn
    );
  }

  return authResponse;
}

/**
 * Handles logout by clearing authentication data
 */
export function handleLogout(): void {
  clearAuthData();
}

/**
 * Checks if user is currently authenticated
 * 
 * @returns True if user has valid authentication token
 */
export function isAuthenticated(): boolean {
  const token = getAuthToken();
  return token !== null && !isTokenExpired();
}
```