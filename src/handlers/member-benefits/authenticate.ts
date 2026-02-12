import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

/**
 * Environment variables required for authentication
 */
interface AuthEnvironment {
  JWT_SECRET: string;
  JWT_EXPIRATION?: string;
  MEMBER_TABLE_NAME?: string;
}

/**
 * Login request body structure
 */
interface LoginRequest {
  email: string;
  password: string;
}

/**
 * JWT payload structure
 */
interface JWTPayload {
  userId: string;
  email: string;
  membershipLevel?: string;
}

/**
 * Authentication response structure
 */
interface AuthResponse {
  success: boolean;
  token?: string;
  expiresIn?: number;
  user?: {
    id: string;
    email: string;
    membershipLevel?: string;
  };
  message?: string;
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
 * Validates the login request body
 * @param body - Request body to validate
 * @returns Validation result with parsed data or error
 */
function validateLoginRequest(body: string | null): {
  valid: boolean;
  data?: LoginRequest;
  error?: string;
} {
  if (!body) {
    return { valid: false, error: 'Request body is required' };
  }

  try {
    const data = JSON.parse(body) as LoginRequest;

    if (!data.email || typeof data.email !== 'string') {
      return { valid: false, error: 'Valid email is required' };
    }

    if (!data.password || typeof data.password !== 'string') {
      return { valid: false, error: 'Password is required' };
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true, data };
  } catch (error) {
    return { valid: false, error: 'Invalid JSON in request body' };
  }
}

/**
 * Retrieves user credentials from the database
 * @param email - User email address
 * @returns User data or null if not found
 */
async function getUserByEmail(email: string): Promise<{
  id: string;
  email: string;
  passwordHash: string;
  membershipLevel?: string;
} | null> {
  // TODO: Implement actual database lookup using DynamoDB
  // This is a placeholder implementation
  // In production, this should query the MEMBER_TABLE_NAME DynamoDB table
  
  // Example implementation structure:
  // const dynamodb = new AWS.DynamoDB.DocumentClient();
  // const result = await dynamodb.get({
  //   TableName: process.env.MEMBER_TABLE_NAME!,
  //   Key: { email }
  // }).promise();
  // return result.Item as UserData | null;

  console.log(`Looking up user with email: ${email}`);
  
  // Placeholder: Return null to indicate user not found
  // Replace with actual database query
  return null;
}

/**
 * Verifies password against stored hash
 * @param password - Plain text password
 * @param hash - Stored password hash
 * @returns True if password matches
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

/**
 * Generates a JWT token for authenticated user
 * @param payload - JWT payload data
 * @param secret - JWT secret key
 * @param expiresIn - Token expiration time
 * @returns Signed JWT token
 */
function generateToken(
  payload: JWTPayload,
  secret: string,
  expiresIn: string = '24h'
): string {
  return jwt.sign(payload, secret, {
    expiresIn,
    issuer: 'member-benefits-auth',
    audience: 'member-benefits-app',
  });
}

/**
 * Creates a standardized API response
 * @param statusCode - HTTP status code
 * @param body - Response body
 * @returns API Gateway proxy result
 */
function createResponse(
  statusCode: number,
  body: AuthResponse
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

/**
 * Lambda handler for member benefits authentication
 * Processes login form submission, validates credentials, and returns JWT token
 * 
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with JWT token or error
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  console.log('Authentication request received', {
    path: event.path,
    method: event.httpMethod,
  });

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
      message: 'Method not allowed. Use POST.',
    });
  }

  try {
    // Validate environment variables
    const env = process.env as AuthEnvironment;
    if (!env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set');
      return createResponse(500, {
        success: false,
        message: 'Server configuration error',
      });
    }

    // Validate request body
    const validation = validateLoginRequest(event.body);
    if (!validation.valid || !validation.data) {
      return createResponse(400, {
        success: false,
        message: validation.error || 'Invalid request',
      });
    }

    const { email, password } = validation.data;

    // Retrieve user from database
    const user = await getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      // Use generic error message to prevent user enumeration
      return createResponse(401, {
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return createResponse(401, {
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const tokenPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      membershipLevel: user.membershipLevel,
    };

    const expiresIn = env.JWT_EXPIRATION || '24h';
    const token = generateToken(tokenPayload, env.JWT_SECRET, expiresIn);

    // Calculate expiration timestamp
    const expirationSeconds = expiresIn.endsWith('h')
      ? parseInt(expiresIn) * 3600
      : expiresIn.endsWith('d')
      ? parseInt(expiresIn) * 86400
      : 86400; // Default to 24 hours

    console.log('Authentication successful', {
      userId: user.id,
      email: user.email,
    });

    // Return success response with token
    return createResponse(200, {
      success: true,
      token,
      expiresIn: expirationSeconds,
      user: {
        id: user.id,
        email: user.email,
        membershipLevel: user.membershipLevel,
      },
      message: 'Authentication successful',
    });
  } catch (error) {
    console.error('Authentication error:', error);

    // Don't expose internal error details to client
    return createResponse(500, {
      success: false,
      message: 'An error occurred during authentication',
    });
  }
}
```