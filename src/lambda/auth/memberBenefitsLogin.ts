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
 * Login request type
 */
type LoginRequest = z.infer<typeof loginRequestSchema>;

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
 * Response body interface
 */
interface LoginResponse {
  success: boolean;
  token?: string;
  expiresIn?: number;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * CORS headers configuration
 */
const getCorsHeaders = (origin?: string): Record<string, string> => {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',');
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
  };
};

/**
 * Creates a base64url encoded string
 */
const base64UrlEncode = (input: string): string => {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

/**
 * Generates a JWT token
 */
const generateJWT = (payload: JWTPayload, secret: string): string => {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

/**
 * Validates user credentials
 * In production, this should query a database or external authentication service
 */
const validateCredentials = async (email: string, password: string): Promise<boolean> => {
  // TODO: Replace with actual database lookup or authentication service
  // This is a placeholder implementation for demonstration
  
  // Simulate async database call
  await new Promise(resolve => setTimeout(resolve, 100));

  // For development/testing purposes only
  // In production, implement proper password hashing verification (bcrypt, argon2, etc.)
  const validUsers = [
    { email: 'member@example.com', passwordHash: 'hashed_password_here' },
  ];

  // This is NOT secure - implement proper password verification in production
  const user = validUsers.find(u => u.email === email);
  return user !== undefined && password.length >= 8;
};

/**
 * Creates an API Gateway response
 */
const createResponse = (
  statusCode: number,
  body: LoginResponse,
  headers: Record<string, string> = {}
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      ...getCorsHeaders(),
      ...headers,
    },
    body: JSON.stringify(body),
  };
};

/**
 * Validates environment variables
 */
const validateEnvironment = (): EnvironmentVariables => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return {
    JWT_SECRET: jwtSecret,
    TOKEN_EXPIRY_HOURS: process.env.TOKEN_EXPIRY_HOURS || '24',
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  };
};

/**
 * Lambda handler for member benefits login authentication
 * 
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with JWT token or error
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Member benefits login request received', {
    path: event.path,
    method: event.httpMethod,
    requestId: event.requestContext.requestId,
  });

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, { success: true });
  }

  // Validate HTTP method
  if (event.httpMethod !== 'POST') {
    return createResponse(405, {
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    // Validate environment variables
    const env = validateEnvironment();

    // Parse request body
    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    let requestBody: unknown;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      return createResponse(400, {
        success: false,
        message: 'Invalid JSON in request body',
      });
    }

    // Validate request schema
    const validationResult = loginRequestSchema.safeParse(requestBody);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return createResponse(400, {
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    const { email, password }: LoginRequest = validationResult.data;

    // Validate credentials
    const isValid = await validateCredentials(email, password);

    if (!isValid) {
      console.warn('Invalid login attempt', { email });
      return createResponse(401, {
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const tokenExpiryHours = parseInt(env.TOKEN_EXPIRY_HOURS || '24', 10);
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = tokenExpiryHours * 60 * 60;

    const payload: JWTPayload = {
      sub: email,
      email,
      iat: now,
      exp: now + expiresIn,
    };

    const token = generateJWT(payload, env.JWT_SECRET);

    console.log('Login successful', {
      email,
      expiresIn,
    });

    return createResponse(200, {
      success: true,
      token,
      expiresIn,
      message: 'Login successful',
    });

  } catch (error) {
    console.error('Error processing login request', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};