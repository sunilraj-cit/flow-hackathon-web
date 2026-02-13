import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Interface for login request body
 */
interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Interface for authentication response
 */
interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  userId?: string;
}

/**
 * CORS headers for API responses
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json',
};

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
    return { valid: false, error: 'Valid email is required' };
  }

  if (!isValidEmail(body.email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (!body.password || typeof body.password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (body.password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  return { valid: true };
};

/**
 * Authenticates user credentials
 * @param email - User email
 * @param password - User password
 * @returns Authentication result with token if successful
 */
const authenticateUser = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  try {
    // TODO: Implement actual authentication logic
    // This should integrate with your authentication service (e.g., Cognito, DynamoDB, etc.)
    // For now, this is a placeholder implementation
    
    // Simulate async authentication call
    await new Promise(resolve => setTimeout(resolve, 100));

    // Placeholder validation - replace with actual authentication
    if (email && password) {
      // In production, verify credentials against your auth service
      // Generate JWT token or session token
      const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
      const userId = Buffer.from(email).toString('base64').substring(0, 16);

      return {
        success: true,
        message: 'Authentication successful',
        token,
        userId,
      };
    }

    return {
      success: false,
      message: 'Invalid credentials',
    };
  } catch (error) {
    console.error('Authentication error:', error);
    throw new Error('Authentication service error');
  }
};

/**
 * Creates API Gateway response
 * @param statusCode - HTTP status code
 * @param body - Response body
 * @returns Formatted API Gateway response
 */
const createResponse = (
  statusCode: number,
  body: Record<string, any>
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
};

/**
 * Lambda handler for authentication
 * Processes login form submission and handles authentication logic
 * 
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with authentication response
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Authentication request received:', {
    path: event.path,
    method: event.httpMethod,
    requestId: event.requestContext.requestId,
  });

  try {
    // Handle OPTIONS request for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, { message: 'OK' });
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return createResponse(405, {
        success: false,
        message: 'Method not allowed',
      });
    }

    // Parse request body
    let requestBody: LoginRequest;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return createResponse(400, {
        success: false,
        message: 'Invalid JSON in request body',
      });
    }

    // Validate request
    const validation = validateLoginRequest(requestBody);
    if (!validation.valid) {
      return createResponse(400, {
        success: false,
        message: validation.error,
      });
    }

    // Authenticate user
    const authResult = await authenticateUser(
      requestBody.email.toLowerCase().trim(),
      requestBody.password
    );

    if (!authResult.success) {
      return createResponse(401, {
        success: false,
        message: authResult.message,
      });
    }

    // Log successful authentication (without sensitive data)
    console.log('Authentication successful:', {
      userId: authResult.userId,
      timestamp: new Date().toISOString(),
    });

    // Return success response
    return createResponse(200, {
      success: true,
      message: authResult.message,
      token: authResult.token,
      userId: authResult.userId,
    });
  } catch (error) {
    console.error('Unexpected error in authentication handler:', error);

    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};
```