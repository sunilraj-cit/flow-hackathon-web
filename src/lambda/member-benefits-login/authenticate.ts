import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

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
 * @returns Parsed login request or null if invalid
 */
const validateLoginRequest = (body: string | null): LoginRequest | null => {
  if (!body) {
    return null;
  }

  try {
    const parsed = JSON.parse(body);
    
    if (!parsed.email || typeof parsed.email !== 'string') {
      return null;
    }
    
    if (!parsed.password || typeof parsed.password !== 'string') {
      return null;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parsed.email)) {
      return null;
    }

    return {
      email: parsed.email.toLowerCase().trim(),
      password: parsed.password,
    };
  } catch (error) {
    return null;
  }
};

/**
 * Hashes a password using SHA-256
 * @param password - The password to hash
 * @returns Hashed password
 */
const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

/**
 * Authenticates user credentials
 * This is a placeholder implementation. In production, this should query a database.
 * @param email - User email
 * @param password - User password
 * @returns User data if authenticated, null otherwise
 */
const authenticateUser = async (
  email: string,
  password: string
): Promise<{ id: string; email: string; name?: string } | null> => {
  // TODO: Replace with actual database query
  // This is a mock implementation for demonstration
  const hashedPassword = hashPassword(password);
  
  // In production, query DynamoDB or other database
  // const user = await dynamoDB.get({
  //   TableName: process.env.USERS_TABLE_NAME,
  //   Key: { email }
  // }).promise();
  
  // Mock user for development - REMOVE IN PRODUCTION
  if (email === 'test@example.com' && password === 'password123') {
    return {
      id: crypto.randomUUID(),
      email: email,
      name: 'Test User',
    };
  }

  return null;
};

/**
 * Generates a JWT token for authenticated user
 * @param user - User data to encode in token
 * @returns JWT token string
 */
const generateToken = (user: { id: string; email: string; name?: string }): string => {
  const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
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
 * Parses JWT expiration time to seconds
 * @param expiresIn - Expiration string (e.g., '24h', '7d')
 * @returns Expiration time in seconds
 */
const parseExpirationTime = (expiresIn: string): number => {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 86400; // Default 24 hours
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 86400;
  }
};

/**
 * Creates a successful API response
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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify(body),
  };
};

/**
 * Lambda handler for member benefits login authentication
 * Validates credentials and returns JWT token on success
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with token or error
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

    // Validate and parse request body
    const loginRequest = validateLoginRequest(event.body);
    if (!loginRequest) {
      return createResponse(400, {
        error: 'BadRequest',
        message: 'Invalid request body. Email and password are required.',
      });
    }

    // Authenticate user
    const user = await authenticateUser(loginRequest.email, loginRequest.password);
    if (!user) {
      return createResponse(401, {
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = generateToken(user);
    const expiresIn = parseExpirationTime(process.env.JWT_EXPIRES_IN || '24h');

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
    if (error instanceof jwt.JsonWebTokenError) {
      return createResponse(500, {
        error: 'TokenGenerationError',
        message: 'Failed to generate authentication token',
      });
    }

    // Generic error response
    return createResponse(500, {
      error: 'InternalServerError',
      message: 'An unexpected error occurred during authentication',
    });
  }
};
```