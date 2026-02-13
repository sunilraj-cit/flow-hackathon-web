import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as crypto from 'crypto';

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
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Interface for successful login response
 */
interface LoginResponse {
  token: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
  };
}

/**
 * Interface for error response
 */
interface ErrorResponse {
  error: string;
  message: string;
}

/**
 * CORS headers for API responses
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json',
};

/**
 * JWT secret key from environment variable
 */
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-in-production';

/**
 * Token expiration time in seconds (24 hours)
 */
const TOKEN_EXPIRATION = 86400;

/**
 * Validates email format
 * @param email - Email address to validate
 * @returns True if email is valid, false otherwise
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password strength
 * @param password - Password to validate
 * @returns True if password meets requirements, false otherwise
 */
function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

/**
 * Creates a simple JWT token
 * @param payload - JWT payload data
 * @returns JWT token string
 */
function createJWT(payload: JWTPayload): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Hashes password using SHA-256
 * @param password - Plain text password
 * @returns Hashed password
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Validates user credentials against stored data
 * This is a placeholder implementation. In production, this should query a database.
 * @param email - User email
 * @param password - User password
 * @returns User object if credentials are valid, null otherwise
 */
async function validateCredentials(
  email: string,
  password: string
): Promise<{ id: string; email: string } | null> {
  // TODO: Replace with actual database query
  // This is a mock implementation for demonstration
  const hashedPassword = hashPassword(password);

  // In production, query DynamoDB or other database
  // const user = await dynamoDB.get({
  //   TableName: process.env.USERS_TABLE_NAME,
  //   Key: { email }
  // }).promise();

  // Mock validation - replace with actual database lookup
  if (email && password.length >= 8) {
    return {
      id: crypto.randomUUID(),
      email: email,
    };
  }

  return null;
}

/**
 * Parses and validates the request body
 * @param body - Request body string
 * @returns Parsed login request or null if invalid
 */
function parseRequestBody(body: string | null): LoginRequest | null {
  if (!body) {
    return null;
  }

  try {
    const parsed = JSON.parse(body);
    if (!parsed.email || !parsed.password) {
      return null;
    }
    return {
      email: parsed.email,
      password: parsed.password,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Creates a success response
 * @param statusCode - HTTP status code
 * @param body - Response body
 * @returns API Gateway proxy result
 */
function createResponse(statusCode: number, body: LoginResponse | ErrorResponse): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

/**
 * Lambda handler for member benefits login authentication
 * Validates credentials and returns JWT token or session data
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with JWT token or error
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // Handle CORS preflight requests
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
      error: 'MethodNotAllowed',
      message: 'Only POST method is allowed',
    });
  }

  try {
    // Parse request body
    const loginRequest = parseRequestBody(event.body);

    if (!loginRequest) {
      return createResponse(400, {
        error: 'BadRequest',
        message: 'Invalid request body. Email and password are required.',
      });
    }

    const { email, password } = loginRequest;

    // Validate email format
    if (!isValidEmail(email)) {
      return createResponse(400, {
        error: 'ValidationError',
        message: 'Invalid email format',
      });
    }

    // Validate password strength
    if (!isValidPassword(password)) {
      return createResponse(400, {
        error: 'ValidationError',
        message: 'Password must be at least 8 characters long',
      });
    }

    // Validate credentials
    const user = await validateCredentials(email, password);

    if (!user) {
      return createResponse(401, {
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    // Create JWT token
    const now = Math.floor(Date.now() / 1000);
    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      iat: now,
      exp: now + TOKEN_EXPIRATION,
    };

    const token = createJWT(payload);

    // Return success response with token
    const response: LoginResponse = {
      token,
      expiresIn: TOKEN_EXPIRATION,
      user: {
        id: user.id,
        email: user.email,
      },
    };

    return createResponse(200, response);
  } catch (error) {
    console.error('Login error:', error);

    // Return generic error response
    return createResponse(500, {
      error: 'InternalServerError',
      message: 'An error occurred during login. Please try again later.',
    });
  }
}
```