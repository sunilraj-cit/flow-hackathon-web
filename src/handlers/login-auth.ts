import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';

/**
 * Schema for login request validation
 */
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Response structure for authentication
 */
interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  memberId?: string;
  expiresIn?: number;
}

/**
 * CORS headers for API responses
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
  'Content-Type': 'application/json',
};

/**
 * Creates a standardized API Gateway response
 * 
 * @param statusCode - HTTP status code
 * @param body - Response body object
 * @returns APIGatewayProxyResult
 */
function createResponse(statusCode: number, body: AuthResponse): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

/**
 * Validates member credentials against the database
 * 
 * @param email - Member email address
 * @param password - Member password
 * @returns Promise<AuthResponse>
 */
async function validateCredentials(email: string, password: string): Promise<AuthResponse> {
  // TODO: Implement actual database lookup and password verification
  // This is a placeholder implementation
  
  try {
    // Simulate database query delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // TODO: Replace with actual DynamoDB query or RDS connection
    // const member = await getMemberByEmail(email);
    // const isValid = await verifyPassword(password, member.passwordHash);
    
    // Placeholder validation logic
    const isValidEmail = email.includes('@');
    const isValidPassword = password.length >= 8;
    
    if (!isValidEmail || !isValidPassword) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }
    
    // TODO: Generate actual JWT token with proper signing
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
    const memberId = Buffer.from(email).toString('base64').substring(0, 16);
    
    return {
      success: true,
      message: 'Authentication successful',
      token,
      memberId,
      expiresIn: 3600, // 1 hour in seconds
    };
  } catch (error) {
    console.error('Error validating credentials:', error);
    throw new Error('Authentication service error');
  }
}

/**
 * Logs authentication attempt for security monitoring
 * 
 * @param email - Member email address
 * @param success - Whether authentication was successful
 * @param ipAddress - Client IP address
 */
async function logAuthAttempt(email: string, success: boolean, ipAddress?: string): Promise<void> {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      email,
      success,
      ipAddress: ipAddress || 'unknown',
      userAgent: 'lambda-handler',
    };
    
    // TODO: Implement actual logging to CloudWatch or DynamoDB
    console.log('Auth attempt:', JSON.stringify(logEntry));
  } catch (error) {
    console.error('Error logging auth attempt:', error);
    // Don't throw - logging failure shouldn't break authentication
  }
}

/**
 * Lambda handler for processing login form submission and authenticating member credentials
 * 
 * @param event - API Gateway proxy event
 * @returns Promise<APIGatewayProxyResult>
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: '',
    };
  }
  
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return createResponse(405, {
      success: false,
      message: 'Method not allowed',
    });
  }
  
  try {
    // Parse and validate request body
    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }
    
    let requestBody: unknown;
    try {
      requestBody = JSON.parse(event.body);
    } catch (parseError) {
      return createResponse(400, {
        success: false,
        message: 'Invalid JSON in request body',
      });
    }
    
    // Validate request schema
    const validationResult = loginSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ');
      return createResponse(400, {
        success: false,
        message: `Validation error: ${errors}`,
      });
    }
    
    const { email, password } = validationResult.data;
    
    // Extract client IP for logging
    const clientIp = event.requestContext?.identity?.sourceIp;
    
    // Authenticate credentials
    const authResult = await validateCredentials(email, password);
    
    // Log authentication attempt
    await logAuthAttempt(email, authResult.success, clientIp);
    
    // Return appropriate response
    if (authResult.success) {
      return createResponse(200, authResult);
    } else {
      return createResponse(401, authResult);
    }
    
  } catch (error) {
    console.error('Unexpected error in login handler:', error);
    
    // Don't expose internal error details to client
    return createResponse(500, {
      success: false,
      message: 'An unexpected error occurred during authentication',
    });
  }
}

/**
 * Export handler as default for Lambda compatibility
 */
export default handler;
```