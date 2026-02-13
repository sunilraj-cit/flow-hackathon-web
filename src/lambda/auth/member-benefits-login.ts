import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';

/**
 * Request body validation schema for member benefits login
 */
const loginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

/**
 * Type definition for validated login request
 */
type LoginRequest = z.infer<typeof loginRequestSchema>;

/**
 * Standard API response structure
 */
interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Login response data structure
 */
interface LoginResponseData {
  token: string;
  refreshToken?: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

/**
 * Creates a standardized API Gateway response
 * 
 * @param statusCode - HTTP status code
 * @param body - Response body object
 * @returns Formatted API Gateway response
 */
function createResponse<T>(
  statusCode: number,
  body: ApiResponse<T>
): APIGatewayProxyResult {
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
}

/**
 * Validates the request body against the login schema
 * 
 * @param body - Raw request body string
 * @returns Validated login request object
 * @throws ZodError if validation fails
 */
function validateRequestBody(body: string | null): LoginRequest {
  if (!body) {
    throw new Error('Request body is required');
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(body);
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }

  return loginRequestSchema.parse(parsedBody);
}

/**
 * Authenticates user credentials
 * 
 * @param email - User email address
 * @param password - User password
 * @returns Authentication result with user data and tokens
 */
async function authenticateUser(
  email: string,
  password: string
): Promise<LoginResponseData> {
  // TODO: Implement actual authentication logic
  // This should integrate with your authentication service (Cognito, Auth0, custom, etc.)
  
  // Placeholder implementation
  // In production, this would:
  // 1. Query user database
  // 2. Verify password hash
  // 3. Generate JWT tokens
  // 4. Return user data
  
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Mock successful authentication
  // Replace with actual authentication logic
  if (email && password) {
    return {
      token: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600,
      user: {
        id: 'mock-user-id',
        email: email,
        name: 'Mock User',
      },
    };
  }
  
  throw new Error('Invalid credentials');
}

/**
 * Logs authentication attempt for audit purposes
 * 
 * @param email - User email
 * @param success - Whether authentication was successful
 * @param ipAddress - Request IP address
 */
async function logAuthenticationAttempt(
  email: string,
  success: boolean,
  ipAddress?: string
): Promise<void> {
  // TODO: Implement audit logging
  // This should log to CloudWatch, DynamoDB, or your logging service
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    email,
    success,
    ipAddress,
    service: 'member-benefits-login',
  };
  
  console.log('Authentication attempt:', JSON.stringify(logEntry));
}

/**
 * Lambda handler for member benefits login authentication
 * 
 * Validates incoming login requests, authenticates users, and returns
 * appropriate responses with JWT tokens on success.
 * 
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with authentication response
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  // Handle preflight CORS requests
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
      message: 'Method not allowed',
    });
  }

  const requestId = event.requestContext.requestId;
  const ipAddress = event.requestContext.identity.sourceIp;

  console.log(`Processing login request: ${requestId}`);

  try {
    // Validate request body
    const loginRequest = validateRequestBody(event.body);

    console.log(`Login attempt for email: ${loginRequest.email}`);

    // Authenticate user
    const authResult = await authenticateUser(
      loginRequest.email,
      loginRequest.password
    );

    // Log successful authentication
    await logAuthenticationAttempt(loginRequest.email, true, ipAddress);

    // Return success response
    return createResponse<LoginResponseData>(200, {
      success: true,
      message: 'Login successful',
      data: authResult,
    });
  } catch (error) {
    console.error('Login error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const validationErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return createResponse(400, {
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
    }

    // Handle authentication errors
    if (error instanceof Error) {
      // Log failed authentication attempt
      if (event.body) {
        try {
          const parsedBody = JSON.parse(event.body);
          if (parsedBody.email) {
            await logAuthenticationAttempt(parsedBody.email, false, ipAddress);
          }
        } catch {
          // Ignore parsing errors for logging
        }
      }

      // Don't expose internal error details
      if (error.message === 'Invalid credentials') {
        return createResponse(401, {
          success: false,
          message: 'Invalid email or password',
        });
      }

      if (error.message === 'Request body is required' || 
          error.message === 'Invalid JSON in request body') {
        return createResponse(400, {
          success: false,
          message: error.message,
        });
      }
    }

    // Generic error response
    return createResponse(500, {
      success: false,
      message: 'An error occurred during authentication',
    });
  }
}
```