import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

interface ErrorResponse {
  error: string;
  message: string;
}

/**
 * Validates the login request body
 * @param body - The request body to validate
 * @returns True if valid, false otherwise
 */
const validateLoginRequest = (body: any): body is LoginRequest => {
  return (
    body &&
    typeof body.email === 'string' &&
    body.email.trim().length > 0 &&
    typeof body.password === 'string' &&
    body.password.trim().length > 0
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
 * Retrieves user from database by email
 * @param email - User email address
 * @returns User object or null if not found
 */
const getUserByEmail = async (email: string): Promise<any | null> => {
  // TODO: Implement actual database lookup
  // This is a placeholder implementation
  // Replace with actual DynamoDB or RDS query
  
  // Example mock user for development
  if (process.env.NODE_ENV === 'development') {
    return {
      id: 'user-123',
      email: email,
      name: 'Test User',
      passwordHash: await bcrypt.hash('password123', 10), // Mock hashed password
    };
  }
  
  // Production implementation would query the database
  // const dynamoDB = new AWS.DynamoDB.DocumentClient();
  // const result = await dynamoDB.get({
  //   TableName: process.env.USERS_TABLE_NAME!,
  //   Key: { email }
  // }).promise();
  // return result.Item || null;
  
  return null;
};

/**
 * Verifies password against stored hash
 * @param password - Plain text password
 * @param hash - Stored password hash
 * @returns True if password matches
 */
const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

/**
 * Generates JWT token for authenticated user
 * @param userId - User ID
 * @param email - User email
 * @returns JWT token string
 */
const generateToken = (userId: string, email: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  
  return jwt.sign(
    {
      sub: userId,
      email: email,
      iat: Math.floor(Date.now() / 1000),
    },
    secret,
    {
      expiresIn,
      issuer: 'member-benefits-api',
      audience: 'member-benefits-app',
    }
  );
};

/**
 * Gets token expiration time in seconds
 * @returns Expiration time in seconds
 */
const getTokenExpirationTime = (): number => {
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  
  // Parse expiration string (e.g., "24h", "7d", "3600")
  const match = expiresIn.match(/^(\d+)([hdm]?)$/);
  if (!match) {
    return 86400; // Default to 24 hours
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2] || 's';
  
  switch (unit) {
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    case 'm':
      return value * 60;
    default:
      return value;
  }
};

/**
 * Creates API Gateway response
 * @param statusCode - HTTP status code
 * @param body - Response body
 * @returns API Gateway proxy result
 */
const createResponse = (
  statusCode: number,
  body: LoginResponse | ErrorResponse
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify(body),
  };
};

/**
 * Lambda handler for POST /login endpoint
 * Authenticates user credentials and returns JWT token
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with JWT token or error
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, { error: '', message: 'OK' });
    }

    // Validate HTTP method
    if (event.httpMethod !== 'POST') {
      return createResponse(405, {
        error: 'MethodNotAllowed',
        message: 'Only POST method is allowed',
      });
    }

    // Parse request body
    let requestBody: any;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      return createResponse(400, {
        error: 'InvalidRequest',
        message: 'Invalid JSON in request body',
      });
    }

    // Validate request body
    if (!validateLoginRequest(requestBody)) {
      return createResponse(400, {
        error: 'ValidationError',
        message: 'Email and password are required',
      });
    }

    const { email, password } = requestBody;

    // Validate email format
    if (!isValidEmail(email)) {
      return createResponse(400, {
        error: 'ValidationError',
        message: 'Invalid email format',
      });
    }

    // Retrieve user from database
    const user = await getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return createResponse(401, {
        error: 'AuthenticationFailed',
        message: 'Invalid email or password',
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return createResponse(401, {
        error: 'AuthenticationFailed',
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email);
    const expiresIn = getTokenExpirationTime();

    // Return success response
    const response: LoginResponse = {
      token,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };

    return createResponse(200, response);
  } catch (error) {
    console.error('Authentication error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('JWT_SECRET')) {
        return createResponse(500, {
          error: 'ConfigurationError',
          message: 'Server configuration error',
        });
      }
    }

    // Generic error response
    return createResponse(500, {
      error: 'InternalServerError',
      message: 'An unexpected error occurred during authentication',
    });
  }
};
```