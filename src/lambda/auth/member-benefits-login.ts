import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sign } from 'jsonwebtoken';
import { hash, compare } from 'bcryptjs';

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
  memberBenefits: boolean;
}

/**
 * Interface for user data (mock - replace with actual database integration)
 */
interface User {
  id: string;
  email: string;
  passwordHash: string;
  hasMemberBenefits: boolean;
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
 * Validates password requirements
 * @param password - Password to validate
 * @returns True if password meets requirements, false otherwise
 */
const isValidPassword = (password: string): boolean => {
  return password && password.length >= 8;
};

/**
 * Retrieves user from database by email
 * TODO: Replace with actual database query (DynamoDB, RDS, etc.)
 * @param email - User email address
 * @returns User object or null if not found
 */
const getUserByEmail = async (email: string): Promise<User | null> => {
  // Mock implementation - replace with actual database query
  // Example: const result = await dynamoDB.get({ TableName: 'Users', Key: { email } }).promise();
  
  // For demonstration purposes only
  if (process.env.NODE_ENV === 'development') {
    // Mock user for testing
    return {
      id: 'mock-user-id',
      email: email,
      passwordHash: await hash('password123', 10),
      hasMemberBenefits: true,
    };
  }
  
  return null;
};

/**
 * Generates JWT token for authenticated user
 * @param payload - JWT payload data
 * @returns Signed JWT token
 */
const generateToken = (payload: JWTPayload): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  return sign(payload, secret, {
    expiresIn,
    issuer: 'member-benefits-auth',
    audience: 'member-benefits-portal',
  });
};

/**
 * Creates API Gateway response
 * @param statusCode - HTTP status code
 * @param body - Response body object
 * @returns API Gateway proxy result
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
 * Validates and parses request body
 * @param event - API Gateway proxy event
 * @returns Parsed login request or null if invalid
 */
const parseRequestBody = (event: APIGatewayProxyEvent): LoginRequest | null => {
  try {
    if (!event.body) {
      return null;
    }

    const body = JSON.parse(event.body) as LoginRequest;

    if (!body.email || !body.password) {
      return null;
    }

    return body;
  } catch (error) {
    return null;
  }
};

/**
 * Lambda handler for member benefits login authentication
 * Validates user credentials and returns JWT token upon successful authentication
 * 
 * @param event - API Gateway proxy event containing login credentials
 * @returns API Gateway proxy result with JWT token or error message
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, { message: 'OK' });
    }

    // Only accept POST requests
    if (event.httpMethod !== 'POST') {
      return createResponse(405, {
        error: 'Method not allowed',
        message: 'Only POST requests are accepted',
      });
    }

    // Parse and validate request body
    const loginRequest = parseRequestBody(event);
    if (!loginRequest) {
      return createResponse(400, {
        error: 'Invalid request',
        message: 'Request body must contain email and password',
      });
    }

    const { email, password } = loginRequest;

    // Validate email format
    if (!isValidEmail(email)) {
      return createResponse(400, {
        error: 'Invalid email',
        message: 'Please provide a valid email address',
      });
    }

    // Validate password requirements
    if (!isValidPassword(password)) {
      return createResponse(400, {
        error: 'Invalid password',
        message: 'Password must be at least 8 characters long',
      });
    }

    // Retrieve user from database
    const user = await getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return createResponse(401, {
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
    }

    // Verify password
    const isPasswordValid = await compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return createResponse(401, {
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
    }

    // Check if user has member benefits access
    if (!user.hasMemberBenefits) {
      return createResponse(403, {
        error: 'Access denied',
        message: 'You do not have access to member benefits',
      });
    }

    // Generate JWT token
    const tokenPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      memberBenefits: user.hasMemberBenefits,
    };

    const token = generateToken(tokenPayload);

    // Return success response with token
    return createResponse(200, {
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          memberBenefits: user.hasMemberBenefits,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);

    // Return generic error response
    return createResponse(500, {
      error: 'Internal server error',
      message: 'An unexpected error occurred during login',
    });
  }
};
```