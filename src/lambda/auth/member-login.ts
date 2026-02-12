import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

/**
 * Interface for login request body
 */
interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Interface for login response
 */
interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

/**
 * Interface for error response
 */
interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
}

/**
 * Validates email format
 * @param email - Email address to validate
 * @returns True if email is valid, false otherwise
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates login request body
 * @param body - Request body to validate
 * @returns Validation result with error message if invalid
 */
const validateLoginRequest = (body: any): { valid: boolean; error?: string } => {
  if (!body) {
    return { valid: false, error: 'Request body is required' };
  }

  if (!body.email || typeof body.email !== 'string') {
    return { valid: false, error: 'Email is required and must be a string' };
  }

  if (!isValidEmail(body.email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (!body.password || typeof body.password !== 'string') {
    return { valid: false, error: 'Password is required and must be a string' };
  }

  if (body.password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long' };
  }

  return { valid: true };
};

/**
 * Creates a standardized API Gateway response
 * @param statusCode - HTTP status code
 * @param body - Response body
 * @returns Formatted API Gateway response
 */
const createResponse = (
  statusCode: number,
  body: LoginResponse | ErrorResponse
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
 * This is a placeholder implementation. In production, this should:
 * - Query a database (DynamoDB, RDS, etc.)
 * - Verify password hash using bcrypt or similar
 * - Generate JWT token
 * - Implement rate limiting
 * - Log authentication attempts
 * 
 * @param email - User email
 * @param password - User password
 * @returns Authentication result with user data and token
 */
const authenticateUser = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  // TODO: Implement actual authentication logic
  // This is a placeholder for demonstration purposes
  
  // Simulate database query delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // In production, replace this with actual database query and password verification
  // Example:
  // const user = await getUserByEmail(email);
  // if (!user || !(await verifyPassword(password, user.passwordHash))) {
  //   throw new Error('Invalid credentials');
  // }
  // const token = generateJWT(user);

  // Placeholder response
  return {
    success: true,
    message: 'Login successful',
    token: 'placeholder-jwt-token',
    user: {
      id: 'user-123',
      email: email,
      name: 'Member User',
    },
  };
};

/**
 * Lambda handler for member benefits login authentication
 * 
 * @param event - API Gateway proxy event
 * @param context - Lambda execution context
 * @returns API Gateway proxy result
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Member login request received', {
    requestId: context.requestId,
    httpMethod: event.httpMethod,
    path: event.path,
  });

  try {
    // Handle OPTIONS request for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {
        success: true,
        message: 'CORS preflight successful',
      });
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return createResponse(405, {
        success: false,
        message: 'Method not allowed. Only POST requests are accepted.',
      });
    }

    // Parse request body
    let requestBody: LoginRequest;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      console.error('Failed to parse request body', error);
      return createResponse(400, {
        success: false,
        message: 'Invalid JSON in request body',
      });
    }

    // Validate request
    const validation = validateLoginRequest(requestBody);
    if (!validation.valid) {
      console.warn('Validation failed', { error: validation.error });
      return createResponse(400, {
        success: false,
        message: validation.error || 'Validation failed',
      });
    }

    // Authenticate user
    const { email, password } = requestBody;
    const authResult = await authenticateUser(email.toLowerCase().trim(), password);

    console.log('Authentication successful', {
      userId: authResult.user?.id,
      email: authResult.user?.email,
    });

    return createResponse(200, authResult);

  } catch (error) {
    console.error('Login error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('Invalid credentials')) {
        return createResponse(401, {
          success: false,
          message: 'Invalid email or password',
        });
      }

      if (error.message.includes('Account locked')) {
        return createResponse(403, {
          success: false,
          message: 'Account is locked. Please contact support.',
        });
      }
    }

    // Generic error response
    return createResponse(500, {
      success: false,
      message: 'An error occurred during login. Please try again later.',
      error: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.message : 'Unknown error')
        : undefined,
    });
  }
};
```