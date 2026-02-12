import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import * as crypto from 'crypto';

/**
 * Environment variables interface
 */
interface Environment {
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
interface ResponseBody {
  message?: string;
  token?: string;
  expiresIn?: number;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * CORS headers configuration
 */
const getCorsHeaders = (origin?: string): Record<string, string> => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
  };
};

/**
 * Creates a base64 URL-safe encoded string
 */
const base64UrlEncode = (str: string): string => {
  return Buffer.from(str)
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
  // TODO: Implement actual credential validation against database
  // This is a placeholder implementation
  // In production, use proper password hashing (bcrypt, argon2) and database lookup
  
  // For now, this is a mock validation
  // Replace with actual authentication logic
  return email.length > 0 && password.length >= 8;
};

/**
 * Creates an API Gateway response
 */
const createResponse = (
  statusCode: number,
  body: ResponseBody,
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
 * Parses and validates the request body
 */
const parseRequestBody = (event: APIGatewayProxyEvent): LoginRequest => {
  if (!event.body) {
    throw new Error('Request body is required');
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(event.body);
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }

  const result = loginRequestSchema.safeParse(parsedBody);
  
  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    
    const error = new Error('Validation failed');
    (error as any).validationErrors = errors;
    throw error;
  }

  return result.data;
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
    return createResponse(200, {});
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return createResponse(405, {
      message: 'Method not allowed',
    });
  }

  try {
    // Validate environment variables
    const env = process.env as Environment;
    if (!env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set');
      return createResponse(500, {
        message: 'Internal server error',
      });
    }

    // Parse and validate request body
    let loginRequest: LoginRequest;
    try {
      loginRequest = parseRequestBody(event);
    } catch (error: any) {
      if (error.validationErrors) {
        return createResponse(400, {
          message: 'Validation failed',
          errors: error.validationErrors,
        });
      }
      return createResponse(400, {
        message: error.message || 'Invalid request body',
      });
    }

    // Validate credentials
    const isValid = await validateCredentials(
      loginRequest.email,
      loginRequest.password
    );

    if (!isValid) {
      console.warn('Invalid login attempt', {
        email: loginRequest.email,
        timestamp: new Date().toISOString(),
      });
      
      return createResponse(401, {
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const tokenExpiryHours = parseInt(env.TOKEN_EXPIRY_HOURS || '24', 10);
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = tokenExpiryHours * 60 * 60;

    const payload: JWTPayload = {
      sub: crypto.createHash('sha256').update(loginRequest.email).digest('hex'),
      email: loginRequest.email,
      iat: now,
      exp: now + expiresIn,
    };

    const token = generateJWT(payload, env.JWT_SECRET);

    console.log('Login successful', {
      email: loginRequest.email,
      expiresAt: new Date((now + expiresIn) * 1000).toISOString(),
    });

    return createResponse(200, {
      message: 'Login successful',
      token,
      expiresIn,
    });
  } catch (error: any) {
    console.error('Unexpected error during login', {
      error: error.message,
      stack: error.stack,
    });

    return createResponse(500, {
      message: 'Internal server error',
    });
  }
};
```