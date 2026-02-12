import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';

/**
 * Environment variables required for the login handler
 */
interface LoginHandlerEnv {
  JWT_SECRET: string;
  TOKEN_EXPIRY: string;
  USER_TABLE_NAME: string;
  AWS_REGION: string;
}

/**
 * Login request schema validation
 */
const loginRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Login response interface
 */
interface LoginResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  message?: string;
}

/**
 * User record interface from database
 */
interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  isActive: boolean;
  lastLoginAt?: string;
}

/**
 * CORS headers for API responses
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
  'Content-Type': 'application/json',
};

/**
 * Creates a standardized API Gateway response
 * 
 * @param statusCode - HTTP status code
 * @param body - Response body object
 * @returns Formatted API Gateway response
 */
function createResponse(statusCode: number, body: LoginResponse): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

/**
 * Validates environment variables
 * 
 * @throws Error if required environment variables are missing
 */
function validateEnvironment(): LoginHandlerEnv {
  const requiredEnvVars = ['JWT_SECRET', 'TOKEN_EXPIRY', 'USER_TABLE_NAME', 'AWS_REGION'];
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    JWT_SECRET: process.env.JWT_SECRET!,
    TOKEN_EXPIRY: process.env.TOKEN_EXPIRY!,
    USER_TABLE_NAME: process.env.USER_TABLE_NAME!,
    AWS_REGION: process.env.AWS_REGION!,
  };
}

/**
 * Hashes a password using a simple crypto implementation
 * Note: In production, use bcrypt or similar library
 * 
 * @param password - Plain text password
 * @returns Hashed password
 */
async function hashPassword(password: string): Promise<string> {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Verifies password against stored hash
 * 
 * @param password - Plain text password
 * @param hash - Stored password hash
 * @returns True if password matches
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

/**
 * Generates a JWT token for authenticated user
 * 
 * @param userId - User identifier
 * @param email - User email
 * @param expiresIn - Token expiration time in seconds
 * @returns JWT token string
 */
async function generateToken(userId: string, email: string, expiresIn: number): Promise<string> {
  const crypto = await import('crypto');
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresIn,
  })).toString('base64url');

  const env = validateEnvironment();
  const signature = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

/**
 * Generates a refresh token
 * 
 * @param userId - User identifier
 * @returns Refresh token string
 */
async function generateRefreshToken(userId: string): Promise<string> {
  const crypto = await import('crypto');
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${userId}.${randomBytes}`;
}

/**
 * Retrieves user from database by email
 * Note: This is a mock implementation. Replace with actual DynamoDB query
 * 
 * @param email - User email address
 * @returns User record or null if not found
 */
async function getUserByEmail(email: string): Promise<UserRecord | null> {
  // Mock implementation - replace with actual DynamoDB query
  // const AWS = await import('aws-sdk');
  // const dynamodb = new AWS.DynamoDB.DocumentClient();
  // const env = validateEnvironment();
  
  // const result = await dynamodb.query({
  //   TableName: env.USER_TABLE_NAME,
  //   IndexName: 'EmailIndex',
  //   KeyConditionExpression: 'email = :email',
  //   ExpressionAttributeValues: {
  //     ':email': email,
  //   },
  // }).promise();
  
  // return result.Items?.[0] as UserRecord || null;

  // Mock user for development
  if (email === 'test@example.com') {
    return {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: await hashPassword('password123'),
      isActive: true,
    };
  }

  return null;
}

/**
 * Updates user's last login timestamp
 * 
 * @param userId - User identifier
 */
async function updateLastLogin(userId: string): Promise<void> {
  // Mock implementation - replace with actual DynamoDB update
  // const AWS = await import('aws-sdk');
  // const dynamodb = new AWS.DynamoDB.DocumentClient();
  // const env = validateEnvironment();
  
  // await dynamodb.update({
  //   TableName: env.USER_TABLE_NAME,
  //   Key: { id: userId },
  //   UpdateExpression: 'SET lastLoginAt = :timestamp',
  //   ExpressionAttributeValues: {
  //     ':timestamp': new Date().toISOString(),
  //   },
  // }).promise();

  console.log(`Updated last login for user: ${userId}`);
}

/**
 * Processes login request and authenticates user
 * 
 * @param email - User email address
 * @param password - User password
 * @returns Login response with tokens or error
 */
async function processLogin(email: string, password: string): Promise<LoginResponse> {
  try {
    // Retrieve user from database
    const user = await getUserByEmail(email);

    if (!user) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }

    // Check if user account is active
    if (!user.isActive) {
      return {
        success: false,
        message: 'Account is inactive. Please contact support.',
      };
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }

    // Generate tokens
    const env = validateEnvironment();
    const expiresIn = parseInt(env.TOKEN_EXPIRY, 10);
    const token = await generateToken(user.id, user.email, expiresIn);
    const refreshToken = await generateRefreshToken(user.id);

    // Update last login timestamp
    await updateLastLogin(user.id);

    return {
      success: true,
      token,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  } catch (error) {
    console.error('Login processing error:', error);
    throw error;
  }
}

/**
 * Lambda handler for login requests
 * 
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with authentication tokens or error
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Login handler invoked', { path: event.path, method: event.httpMethod });

  try {
    // Handle preflight OPTIONS request
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

    // Parse and validate request body
    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: 'Request body is required',
      });
    }

    let requestBody;
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
      const errors = validationResult.error.errors.map(err => err.message).join(', ');
      return createResponse(400, {
        success: false,
        message: `Validation error: ${errors}`,
      });
    }

    const { email, password } = validationResult.data;

    // Process login
    const loginResult = await processLogin(email, password);

    if (!loginResult.success) {
      return createResponse(401, loginResult);
    }

    return createResponse(200, loginResult);

  } catch (error) {
    console.error('Unhandled error in login handler:', error);

    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
}