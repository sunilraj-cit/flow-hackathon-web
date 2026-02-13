import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Response structure for authentication
 */
interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  userId?: string;
}

/**
 * Login request body structure
 */
interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Validates the login request body
 * @param body - The parsed request body
 * @returns True if valid, false otherwise
 */
const validateLoginRequest = (body: any): body is LoginRequest => {
  return (
    body &&
    typeof body.email === 'string' &&
    typeof body.password === 'string' &&
    body.email.length > 0 &&
    body.password.length > 0
  );
};

/**
 * Validates email format
 * @param email - Email address to validate
 * @returns True if valid email format
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Creates a standardized API Gateway response
 * @param statusCode - HTTP status code
 * @param body - Response body object
 * @returns APIGatewayProxyResult
 */
const createResponse = (
  statusCode: number,
  body: AuthResponse
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'OPTIONS,POST',
    },
    body: JSON.stringify(body),
  };
};

/**
 * Authenticates user credentials
 * This is a placeholder implementation - replace with actual authentication logic
 * @param email - User email
 * @param password - User password
 * @returns Authentication result with token if successful
 */
const authenticateUser = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  // TODO: Implement actual authentication logic
  // - Query user database (DynamoDB, RDS, etc.)
  // - Verify password hash (bcrypt, argon2, etc.)
  // - Generate JWT token or session token
  // - Return user information

  // Placeholder implementation
  try {
    // Simulate database lookup delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Example validation (replace with actual database check)
    if (email === 'test@example.com' && password === 'password123') {
      return {
        success: true,
        message: 'Authentication successful',
        token: 'mock-jwt-token-' + Date.now(),
        userId: 'user-' + Date.now(),
      };
    }

    return {
      success: false,
      message: 'Invalid email or password',
    };
  } catch (error) {
    console.error('Authentication error:', error);
    throw new Error('Authentication service error');
  }
};

/**
 * Lambda handler for authentication
 * Processes login form submission and handles authentication logic
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Authentication request received', {
    path: event.path,
    method: event.httpMethod,
    requestId: event.requestContext.requestId,
  });

  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {
        success: true,
        message: 'CORS preflight successful',
      });
    }

    // Validate HTTP method
    if (event.httpMethod !== 'POST') {
      return createResponse(405, {
        success: false,
        message: 'Method not allowed. Use POST.',
      });
    }

    // Parse request body
    let requestBody: any;
    try {
      if (!event.body) {
        return createResponse(400, {
          success: false,
          message: 'Request body is required',
        });
      }
      requestBody = JSON.parse(event.body);
    } catch (error) {
      console.error('JSON parse error:', error);
      return createResponse(400, {
        success: false,
        message: 'Invalid JSON in request body',
      });
    }

    // Validate request structure
    if (!validateLoginRequest(requestBody)) {
      return createResponse(400, {
        success: false,
        message: 'Invalid request. Email and password are required.',
      });
    }

    const { email, password } = requestBody;

    // Validate email format
    if (!isValidEmail(email)) {
      return createResponse(400, {
        success: false,
        message: 'Invalid email format',
      });
    }

    // Validate password length
    if (password.length < 6) {
      return createResponse(400, {
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Sanitize email
    const sanitizedEmail = email.toLowerCase().trim();

    // Authenticate user
    const authResult = await authenticateUser(sanitizedEmail, password);

    if (authResult.success) {
      console.log('Authentication successful', {
        userId: authResult.userId,
        email: sanitizedEmail,
      });

      return createResponse(200, authResult);
    } else {
      console.warn('Authentication failed', {
        email: sanitizedEmail,
        reason: authResult.message,
      });

      return createResponse(401, authResult);
    }
  } catch (error) {
    console.error('Unexpected error in authentication handler:', error);

    return createResponse(500, {
      success: false,
      message: 'Internal server error. Please try again later.',
    });
  }
};
```