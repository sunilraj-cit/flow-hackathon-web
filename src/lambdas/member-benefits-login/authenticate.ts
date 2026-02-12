import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

/**
 * Interface for login request body
 */
interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Interface for JWT payload
 */
interface JWTPayload {
  userId: string;
  email: string;
  membershipLevel?: string;
}

/**
 * Interface for user data from database
 */
interface UserData {
  userId: string;
  email: string;
  passwordHash: string;
  membershipLevel?: string;
  isActive: boolean;
}

/**
 * Environment variables
 */
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

/**
 * Creates a standardized API Gateway response
 * 
 * @param statusCode - HTTP status code
 * @param body - Response body object
 * @returns APIGatewayProxyResult
 */
const createResponse = (statusCode: number, body: Record<string, any>): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': CORS_ORIGIN,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify(body),
  };
};

/**
 * Validates the login request body
 * 
 * @param body - Request body to validate
 * @returns Validation result with parsed data or error
 */
const validateLoginRequest = (body: string | null): { valid: boolean; data?: LoginRequest; error?: string } => {
  if (!body) {
    return { valid: false, error: 'Request body is required' };
  }

  try {
    const parsed = JSON.parse(body) as LoginRequest;

    if (!parsed.email || typeof parsed.email !== 'string') {
      return { valid: false, error: 'Valid email is required' };
    }

    if (!parsed.password || typeof parsed.password !== 'string') {
      return { valid: false, error: 'Password is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parsed.email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    if (parsed.password.length < 6) {
      return { valid: false, error: 'Password must be at least 6 characters' };
    }

    return { valid: true, data: parsed };
  } catch (error) {
    return { valid: false, error: 'Invalid JSON in request body' };
  }
};

/**
 * Retrieves user data from the database
 * This is a placeholder - implement actual database logic
 * 
 * @param email - User email
 * @returns User data or null if not found
 */
const getUserByEmail = async (email: string): Promise<UserData | null> => {
  // TODO: Implement actual database query using DynamoDB or other data store
  // This is a placeholder implementation
  
  // Example implementation would use AWS SDK to query DynamoDB:
  // const dynamodb = new AWS.DynamoDB.DocumentClient();
  // const result = await dynamodb.get({
  //   TableName: process.env.USERS_TABLE_NAME || '',
  //   Key: { email }
  // }).promise();
  // return result.Item as UserData | null;

  console.log(`Fetching user with email: ${email}`);
  
  // Placeholder return - replace with actual database call
  return null;
};

/**
 * Verifies password against stored hash
 * 
 * @param password - Plain text password
 * @param passwordHash - Stored password hash
 * @returns True if password matches
 */
const verifyPassword = async (password: string, passwordHash: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, passwordHash);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
};

/**
 * Generates a JWT token for authenticated user
 * 
 * @param payload - JWT payload data
 * @returns Signed JWT token
 */
const generateToken = (payload: JWTPayload): string => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
    issuer: 'member-benefits-api',
    audience: 'member-benefits-app',
  });
};

/**
 * Logs authentication attempt for security monitoring
 * 
 * @param email - User email
 * @param success - Whether authentication was successful
 * @param reason - Failure reason if unsuccessful
 */
const logAuthenticationAttempt = async (email: string, success: boolean, reason?: string): Promise<void> => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    email,
    success,
    reason: reason || 'N/A',
    eventType: 'LOGIN_ATTEMPT',
  };

  console.log('Authentication attempt:', JSON.stringify(logEntry));

  // TODO: Implement actual logging to CloudWatch or audit table
  // Example: Store in DynamoDB audit log table
};

/**
 * Main Lambda handler for authentication endpoint
 * Processes login credentials and returns JWT token or error
 * 
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with JWT token or error
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Authentication request received:', {
    path: event.path,
    method: event.httpMethod,
    requestId: event.requestContext.requestId,
  });

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, { message: 'OK' });
  }

  // Validate HTTP method
  if (event.httpMethod !== 'POST') {
    return createResponse(405, {
      error: 'Method Not Allowed',
      message: 'Only POST requests are accepted',
    });
  }

  try {
    // Validate request body
    const validation = validateLoginRequest(event.body);
    if (!validation.valid || !validation.data) {
      return createResponse(400, {
        error: 'Bad Request',
        message: validation.error || 'Invalid request',
      });
    }

    const { email, password } = validation.data;

    // Retrieve user from database
    const user = await getUserByEmail(email.toLowerCase().trim());

    if (!user) {
      await logAuthenticationAttempt(email, false, 'User not found');
      return createResponse(401, {
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      await logAuthenticationAttempt(email, false, 'Account inactive');
      return createResponse(403, {
        error: 'Forbidden',
        message: 'Account is inactive. Please contact support.',
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      await logAuthenticationAttempt(email, false, 'Invalid password');
      return createResponse(401, {
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const tokenPayload: JWTPayload = {
      userId: user.userId,
      email: user.email,
      membershipLevel: user.membershipLevel,
    };

    const token = generateToken(tokenPayload);

    // Log successful authentication
    await logAuthenticationAttempt(email, true);

    // Return success response with token
    return createResponse(200, {
      success: true,
      token,
      user: {
        userId: user.userId,
        email: user.email,
        membershipLevel: user.membershipLevel,
      },
      expiresIn: JWT_EXPIRATION,
    });

  } catch (error) {
    console.error('Authentication error:', error);

    // Log error for monitoring
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'An error occurred during authentication',
    });
  }
};
```