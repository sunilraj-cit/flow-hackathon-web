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
  email: z.string().email('Invalid email address'),
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
 * Creates a base64url encoded string
 * @param input - String to encode
 * @returns Base64url encoded string
 */
function base64urlEncode(input: string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generates a JWT token
 * @param payload - JWT payload data
 * @param secret - Secret key for signing
 * @returns JWT token string
 */
function generateJWT(payload: JWTPayload, secret: string): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Hashes a password using SHA-256
 * @param password - Plain text password
 * @returns Hashed password
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Validates user credentials
 * @param email - User email
 * @param password - User password
 * @returns User data if valid, null otherwise
 */
async function validateCredentials(
  email: string,
  password: string
): Promise<UserCredentials | null> {
  // TODO: Replace with actual database lookup
  // This is a mock implementation for demonstration
  const mockUsers: UserCredentials[] = [
    {
      id: 'user-001',
      email: 'member@example.com',
      passwordHash: hashPassword('Password123!'),
      firstName: 'John',
      lastName: 'Doe',
    },
  ];

  const user = mockUsers.find((u) => u.email === email);
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
 * Creates a standardized API Gateway response
 * @param statusCode - HTTP status code
 * @param body - Response body
 * @param allowedOrigins - Comma-separated list of allowed origins
 * @returns API Gateway proxy result
 */
function createResponse(
  statusCode: number,
  body: LoginResponse,
  allowedOrigins?: string
): APIGatewayProxyResult {
  const origin = allowedOrigins?.split(',')[0] || '*';

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify(body),
  };
}

/**
 * Validates environment variables
 * @param env - Process environment
 * @returns Validated environment variables
 * @throws Error if required variables are missing
 */
function validateEnvironment(env: NodeJS.ProcessEnv): EnvironmentVariables {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  return {
    JWT_SECRET: env.JWT_SECRET,
    TOKEN_EXPIRY_HOURS: env.TOKEN_EXPIRY_HOURS || '24',
    ALLOWED_ORIGINS: env.ALLOWED_ORIGINS,
  };
}

/**
 * Lambda handler for member benefits login authentication
 * Validates credentials and generates JWT token
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with JWT token or error
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  console.log('Member benefits login request received', {
    path: event.path,
    method: event.httpMethod,
    requestId: event.requestContext.requestId,
  });

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, { success: true });
  }

  try {
    // Validate environment variables
    const env = validateEnvironment(process.env);

    // Validate HTTP method
    if (event.httpMethod !== 'POST') {
      return createResponse(
        405,
        {
          success: false,
          error: 'Method not allowed',
          message: 'Only POST requests are supported',
        },
        env.ALLOWED_ORIGINS
      );
    }

    // Parse and validate request body
    if (!event.body) {
      return createResponse(
        400,
        {
          success: false,
          error: 'Bad request',
          message: 'Request body is required',
        },
        env.ALLOWED_ORIGINS
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
          error: 'Bad request',
          message: 'Invalid JSON in request body',
        },
        env.ALLOWED_ORIGINS
      );
    }

    // Validate request schema
    const validationResult = loginRequestSchema.safeParse(requestBody);
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      return createResponse(
        400,
        {
          success: false,
          error: 'Validation error',
          message: errors,
        },
        env.ALLOWED_ORIGINS
      );
    }

    const { email, password } = validationResult.data;

    // Validate credentials
    const user = await validateCredentials(email, password);
    if (!user) {
      console.warn('Failed login attempt', { email });
      return createResponse(
        401,
        {
          success: false,
          error: 'Authentication failed',
          message: 'Invalid email or password',
        },
        env.ALLOWED_ORIGINS
      );
    }

    // Generate JWT token
    const expiryHours = parseInt(env.TOKEN_EXPIRY_HOURS || '24', 10);
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = expiryHours * 60 * 60;

    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      iat: now,
      exp: now + expiresIn,
    };

    const token = generateJWT(payload, env.JWT_SECRET);

    console.log('Login successful', {
      userId: user.id,
      email: user.email,
    });

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
      env.ALLOWED_ORIGINS
    );
  } catch (error) {
    console.error('Login handler error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return createResponse(500, {
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred during login',
    });
  }
}
```