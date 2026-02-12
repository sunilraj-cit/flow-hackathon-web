import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';

/**
 * Input validation schema for member benefits login
 */
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Response body type for successful authentication
 */
interface LoginSuccessResponse {
  success: true;
  token: string;
  expiresIn: number;
  user: {
    email: string;
    memberId: string;
  };
}

/**
 * Response body type for failed authentication
 */
interface LoginErrorResponse {
  success: false;
  error: string;
  message: string;
}

/**
 * Creates a standardized API Gateway response
 * 
 * @param statusCode - HTTP status code
 * @param body - Response body object
 * @returns Formatted API Gateway response
 */
const createResponse = (
  statusCode: number,
  body: LoginSuccessResponse | LoginErrorResponse
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify(body),
  };
};

/**
 * Validates user credentials against the authentication service
 * 
 * @param email - User email address
 * @param password - User password
 * @returns Authentication result with token and user data
 */
const authenticateUser = async (
  email: string,
  password: string
): Promise<LoginSuccessResponse> => {
  // TODO: Implement actual authentication logic with your auth service
  // This is a placeholder implementation
  
  // Simulate async authentication call
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Mock authentication - replace with actual implementation
  if (password.length >= 8) {
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
    const memberId = Buffer.from(email).toString('base64').substring(0, 16);
    
    return {
      success: true,
      token,
      expiresIn: 3600,
      user: {
        email,
        memberId,
      },
    };
  }
  
  throw new Error('Invalid credentials');
};

/**
 * Lambda handler for member benefits login authentication
 * 
 * Validates input credentials and returns authentication token on success
 * 
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with authentication response
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {
      success: true,
      token: '',
      expiresIn: 0,
      user: { email: '', memberId: '' },
    });
  }

  // Validate HTTP method
  if (event.httpMethod !== 'POST') {
    return createResponse(405, {
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Only POST method is allowed',
    });
  }

  try {
    // Parse request body
    if (!event.body) {
      return createResponse(400, {
        success: false,
        error: 'MISSING_BODY',
        message: 'Request body is required',
      });
    }

    let requestBody: unknown;
    try {
      requestBody = JSON.parse(event.body);
    } catch (parseError) {
      return createResponse(400, {
        success: false,
        error: 'INVALID_JSON',
        message: 'Request body must be valid JSON',
      });
    }

    // Validate input against schema
    const validationResult = loginSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      
      return createResponse(400, {
        success: false,
        error: 'VALIDATION_ERROR',
        message: errors[0]?.message || 'Invalid input',
      });
    }

    const { email, password } = validationResult.data;

    // Authenticate user
    const authResult = await authenticateUser(email, password);

    // Log successful authentication (without sensitive data)
    console.log('Successful authentication', {
      email,
      memberId: authResult.user.memberId,
      timestamp: new Date().toISOString(),
    });

    return createResponse(200, authResult);

  } catch (error) {
    // Log error for monitoring
    console.error('Authentication error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message === 'Invalid credentials') {
        return createResponse(401, {
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        });
      }
    }

    // Generic error response
    return createResponse(500, {
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred during authentication',
    });
  }
};
```