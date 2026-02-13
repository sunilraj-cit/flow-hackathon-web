import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import * as crypto from 'crypto';

/**
 * Environment variables interface
 */
interface EnvironmentVariables {
  JWT_SECRET: string;
  TOKEN_EXPIRY_HOURS?: string;
  ALLOWED_ORIGINS?: string;
}

/**
 * Login request schema validation
 */
const loginRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * JWT payload interface
 */
interface JWTPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * User credentials interface (mock - replace with actual database lookup)
 */
interface UserCredentials {
  id: string;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Response body interface
 */
interface LoginResponse {
  success: boolean;
  token?: string;
  expiresIn?: number;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  error?: string;
  message?: string;
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Create HMAC SHA256 signature
 */
function createSignature(data: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate JWT token
 */
function generateJWT(payload: JWTPayload, secret: string): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createSignature(`${encodedHeader}.${encodedPayload}`, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Hash password using SHA256 (for comparison)
 * Note: In production, use bcrypt or similar
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Mock user lookup function
 * Replace with actual database query in production
 */
async function getUserByEmail(email: string): Promise<UserCredentials | null> {
  // TODO: Replace with actual database lookup
  // This is a mock implementation for demonstration
  const mockUsers: Record<string, UserCredentials> = {
    'member@example.com': {
      id: 'user-123',
      email: 'member@example.com',
      passwordHash: hashPassword('Password123!'),
      firstName: 'John',
      lastName: 'Doe',
    },
  };

  return mockUsers[email] || null;
}

/**
 * Verify user credentials
 */
async function verifyCredentials(
  email: string,
  password: string
): Promise<UserCredentials | null> {
  const user = await getUserByEmail(email);
  
  if (!user) {
    return null;
  }

  const passwordHash = hashPassword(password);
  
  if (passwordHash !== user.passwordHash) {
    return null;
  }

  return user;
}

/**
 * Get CORS headers
 */
function getCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',');
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Create API Gateway response
 */
function createResponse(
  statusCode: number,
  body: LoginResponse,
  origin?: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(origin),
    },
    body: JSON.stringify(body),
  };
}

/**
 * Validate environment variables
 */
function validateEnvironment(): EnvironmentVariables {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  return {
    JWT_SECRET: jwtSecret,
    TOKEN_EXPIRY_HOURS: process.env.TOKEN_EXPIRY_HOURS || '24',
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '*',
  };
}

/**
 * Lambda handler for member benefits login
 * 
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with JWT token or error
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const origin = event.headers.origin || event.headers.Origin;

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, { success: true }, origin);
  }

  try {
    // Validate environment variables
    const env = validateEnvironment();

    // Parse and validate request body
    if (!event.body) {
      return createResponse(
        400,
        {
          success: false,
          error: 'Bad Request',
          message: 'Request body is required',
        },
        origin
      );
    }

    let requestBody: unknown;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      return createResponse(
        400,
        {
          success: false,
          error: 'Bad Request',
          message: 'Invalid JSON in request body',
        },
        origin
      );
    }

    // Validate request schema
    const validationResult = loginRequestSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => err.message).join(', ');
      return createResponse(
        400,
        {
          success: false,
          error: 'Validation Error',
          message: errors,
        },
        origin
      );
    }

    const { email, password } = validationResult.data;

    // Verify credentials
    const user = await verifyCredentials(email, password);

    if (!user) {
      // Use generic error message to prevent user enumeration
      return createResponse(
        401,
        {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid email or password',
        },
        origin
      );
    }

    // Generate JWT token
    const tokenExpiryHours = parseInt(env.TOKEN_EXPIRY_HOURS || '24', 10);
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = tokenExpiryHours * 60 * 60;

    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      iat: now,
      exp: now + expiresIn,
    };

    const token = generateJWT(payload, env.JWT_SECRET);

    // Return success response
    return createResponse(
      200,
      {
        success: true,
        token,
        expiresIn,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      },
      origin
    );
  } catch (error) {
    console.error('Login error:', error);

    // Return generic error to client
    return createResponse(
      500,
      {
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred during login',
      },
      origin
    );
  }
}
```