import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

/**
 * Interface for member benefits login request body
 */
interface MemberBenefitsLoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Interface for successful login response
 */
interface LoginSuccessResponse {
  success: true;
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    membershipLevel?: string;
  };
}

/**
 * Interface for error response
 */
interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode: number;
}

/**
 * Validates the login request body
 * @param body - The parsed request body
 * @returns Validation result with error message if invalid
 */
const validateLoginRequest = (body: any): { valid: boolean; error?: string } => {
  if (!body) {
    return { valid: false, error: 'Request body is required' };
  }

  if (!body.email || typeof body.email !== 'string') {
    return { valid: false, error: 'Valid email is required' };
  }

  if (!body.password || typeof body.password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (body.password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  return { valid: true };
};

/**
 * Authenticates user credentials against the member benefits system
 * @param email - User's email address
 * @param password - User's password
 * @returns Authentication result with user data and tokens
 */
const authenticateUser = async (
  email: string,
  password: string
): Promise<LoginSuccessResponse> => {
  // TODO: Implement actual authentication logic with database/auth service
  // This is a placeholder implementation
  
  // Simulate async authentication call
  await new Promise(resolve => setTimeout(resolve, 100));

  // Mock successful authentication
  // In production, this should:
  // 1. Query user from database
  // 2. Verify password hash
  // 3. Generate JWT tokens
  // 4. Store refresh token
  // 5. Return user data and tokens

  const mockToken = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + 3600000 })
  ).toString('base64');

  const mockRefreshToken = Buffer.from(
    JSON.stringify({ email, type: 'refresh', exp: Date.now() + 604800000 })
  ).toString('base64');

  return {
    success: true,
    token: mockToken,
    refreshToken: mockRefreshToken,
    expiresIn: 3600,
    user: {
      id: 'mock-user-id',
      email: email,
      firstName: 'Member',
      lastName: 'User',
      membershipLevel: 'premium',
    },
  };
};

/**
 * Creates a standardized API Gateway response
 * @param statusCode - HTTP status code
 * @param body - Response body object
 * @returns Formatted API Gateway response
 */
const createResponse = (
  statusCode: number,
  body: LoginSuccessResponse | ErrorResponse
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
 * Creates an error response
 * @param statusCode - HTTP status code
 * @param error - Error type/code
 * @param message - Human-readable error message
 * @returns Formatted error response
 */
const createErrorResponse = (
  statusCode: number,
  error: string,
  message: string
): APIGatewayProxyResult => {
  return createResponse(statusCode, {
    success: false,
    error,
    message,
    statusCode,
  });
};

/**
 * Lambda handler for member benefits login authentication
 * Processes login requests and returns authentication tokens
 * 
 * @param event - API Gateway proxy event
 * @param context - Lambda execution context
 * @returns API Gateway proxy result with authentication response
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Member Benefits Login - Request received', {
    requestId: context.requestId,
    httpMethod: event.httpMethod,
    path: event.path,
  });

  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {
        success: true,
        token: '',
        refreshToken: '',
        expiresIn: 0,
        user: {
          id: '',
          email: '',
        },
      });
    }

    // Validate HTTP method
    if (event.httpMethod !== 'POST') {
      return createErrorResponse(
        405,
        'METHOD_NOT_ALLOWED',
        'Only POST method is allowed'
      );
    }

    // Parse request body
    let requestBody: MemberBenefitsLoginRequest;
    try {
      if (!event.body) {
        return createErrorResponse(
          400,
          'INVALID_REQUEST',
          'Request body is required'
        );
      }
      requestBody = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Failed to parse request body', parseError);
      return createErrorResponse(
        400,
        'INVALID_JSON',
        'Invalid JSON in request body'
      );
    }

    // Validate request
    const validation = validateLoginRequest(requestBody);
    if (!validation.valid) {
      return createErrorResponse(
        400,
        'VALIDATION_ERROR',
        validation.error || 'Invalid request'
      );
    }

    // Authenticate user
    try {
      const authResult = await authenticateUser(
        requestBody.email.toLowerCase().trim(),
        requestBody.password
      );

      console.log('Authentication successful', {
        userId: authResult.user.id,
        email: authResult.user.email,
      });

      return createResponse(200, authResult);
    } catch (authError: any) {
      console.error('Authentication failed', {
        error: authError.message,
        email: requestBody.email,
      });

      return createErrorResponse(
        401,
        'AUTHENTICATION_FAILED',
        'Invalid email or password'
      );
    }
  } catch (error: any) {
    console.error('Unexpected error in member benefits login', {
      error: error.message,
      stack: error.stack,
      requestId: context.requestId,
    });

    return createErrorResponse(
      500,
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred during login'
    );
  }
};
```