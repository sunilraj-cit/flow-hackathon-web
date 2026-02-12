import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

/**
 * Environment variables required for the Lambda function
 */
interface EnvironmentVariables {
  JWT_SECRET: string;
  JWT_EXPIRATION?: string;
  ALLOWED_ORIGINS?: string;
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
  memberBenefits: boolean;
  iat?: number;
  exp?: number;
}

/**
 * Authentication response structure
 */
interface AuthResponse {
  success: boolean;
  token?: string;
  expiresIn?: number;
  message?: string;
}

/**
 * Validates environment variables
 * @throws {Error} If required environment variables are missing
 */
const validateEnvironment = (): EnvironmentVariables => {
  const JWT_SECRET = process.env.JWT_SECRET;
  
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  return {
    JWT_SECRET,
    JWT_EXPIRATION: process.env.JWT_EXPIRATION || '24h',
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '*',
  };
};

/**
 * Validates the login request body
 * @param body - Request body to validate
 * @returns Parsed login request
 * @throws {Error} If validation fails
 */
const validateLoginRequest = (body: string | null): LoginRequest => {
  if (!body) {
    throw new Error('Request body is required');
  }

  let parsedBody: any;
  try {
    parsedBody = JSON.parse(body);
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }

  const { email, password } = parsedBody;

  if (!email || typeof email !== 'string') {
    throw new Error('Valid email is required');
  }

  if (!password || typeof password !== 'string') {
    throw new Error('Valid password is required');
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  return { email, password };
};

/**
 * Authenticates user credentials
 * In production, this should query a database or external authentication service
 * @param email - User email
 * @param password - User password
 * @returns User ID if authentication successful, null otherwise
 */
const authenticateUser = async (email: string, password: string): Promise<string | null> => {
  // TODO: Replace with actual database query or authentication service call
  // This is a placeholder implementation for demonstration
  
  // Simulate async database call
  await new Promise(resolve => setTimeout(resolve, 100));

  // Hash password for comparison (in production, compare with hashed password from database)
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  // Placeholder validation - replace with actual authentication logic
  // In production, query user database and verify hashed password
  if (email && password.length >= 8) {
    // Generate deterministic user ID based on email for demo purposes
    const userId = crypto.createHash('sha256').update(email).digest('hex').substring(0, 16);
    return userId;
  }

  return null;
};

/**
 * Generates a JWT token for authenticated user
 * @param userId - User identifier
 * @param email - User email
 * @param jwtSecret - Secret key for signing JWT
 * @param expiresIn - Token expiration time
 * @returns Signed JWT token
 */
const generateToken = (
  userId: string,
  email: string,
  jwtSecret: string,
  expiresIn: string
): string => {
  const payload: JWTPayload = {
    userId,
    email,
    memberBenefits: true,
  };

  return jwt.sign(payload, jwtSecret, { expiresIn });
};

/**
 * Creates CORS headers for the response
 * @param allowedOrigins - Comma-separated list of allowed origins or '*'
 * @param origin - Request origin header
 * @returns CORS headers object
 */
const getCorsHeaders = (allowedOrigins: string, origin?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (allowedOrigins === '*') {
    headers['Access-Control-Allow-Origin'] = '*';
  } else if (origin) {
    const allowedOriginsList = allowedOrigins.split(',').map(o => o.trim());
    if (allowedOriginsList.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
  }

  return headers;
};

/**
 * Creates an API Gateway response
 * @param statusCode - HTTP status code
 * @param body - Response body
 * @param headers - Additional headers
 * @returns API Gateway proxy result
 */
const createResponse = (
  statusCode: number,
  body: AuthResponse,
  headers: Record<string, string> = {}
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  };
};

/**
 * Lambda handler for member benefits authentication
 * Processes login requests and returns JWT tokens for authenticated users
 * 
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with JWT token or error message
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Member benefits authentication request received', {
    httpMethod: event.httpMethod,
    path: event.path,
  });

  let env: EnvironmentVariables;
  
  try {
    env = validateEnvironment();
  } catch (error) {
    console.error('Environment validation failed:', error);
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }

  const corsHeaders = getCorsHeaders(
    env.ALLOWED_ORIGINS,
    event.headers.origin || event.headers.Origin
  );

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return createResponse(
      405,
      {
        success: false,
        message: 'Method not allowed',
      },
      corsHeaders
    );
  }

  try {
    // Validate and parse request body
    const { email, password } = validateLoginRequest(event.body);

    console.log('Authentication attempt for email:', email);

    // Authenticate user
    const userId = await authenticateUser(email, password);

    if (!userId) {
      console.log('Authentication failed for email:', email);
      return createResponse(
        401,
        {
          success: false,
          message: 'Invalid email or password',
        },
        corsHeaders
      );
    }

    // Generate JWT token
    const token = generateToken(userId, email, env.JWT_SECRET, env.JWT_EXPIRATION!);

    // Calculate expiration time in seconds
    const expiresIn = env.JWT_EXPIRATION === '24h' ? 86400 : 3600;

    console.log('Authentication successful for user:', userId);

    return createResponse(
      200,
      {
        success: true,
        token,
        expiresIn,
        message: 'Authentication successful',
      },
      corsHeaders
    );

  } catch (error) {
    console.error('Authentication error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    const statusCode = errorMessage.includes('required') || errorMessage.includes('Invalid') ? 400 : 500;

    return createResponse(
      statusCode,
      {
        success: false,
        message: errorMessage,
      },
      corsHeaders
    );
  }
};
```