import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

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
  membershipType: string;
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
    membershipType: string;
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
 * Environment variables
 */
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';
const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE || 'members';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

/**
 * Hash password using SHA-256
 * @param password - Plain text password
 * @returns Hashed password
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns True if valid, false otherwise
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate request body
 * @param body - Request body to validate
 * @returns Validation result
 */
function validateLoginRequest(body: any): { valid: boolean; error?: string } {
  if (!body) {
    return { valid: false, error: 'Request body is required' };
  }

  if (!body.email || typeof body.email !== 'string') {
    return { valid: false, error: 'Email is required and must be a string' };
  }

  if (!isValidEmail(body.email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (!body.password || typeof body.password !== 'string') {
    return { valid: false, error: 'Password is required and must be a string' };
  }

  if (body.password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  return { valid: true };
}

/**
 * Retrieve member from DynamoDB
 * @param email - Member email
 * @returns Member data or null
 */
async function getMemberByEmail(email: string): Promise<any | null> {
  try {
    const AWS = await import('aws-sdk');
    const dynamodb = new AWS.DynamoDB.DocumentClient({ region: AWS_REGION });

    const params = {
      TableName: DYNAMODB_TABLE,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email.toLowerCase(),
      },
    };

    const result = await dynamodb.query(params).promise();

    if (result.Items && result.Items.length > 0) {
      return result.Items[0];
    }

    return null;
  } catch (error) {
    console.error('Error retrieving member from DynamoDB:', error);
    throw new Error('Database error');
  }
}

/**
 * Verify password against stored hash
 * @param password - Plain text password
 * @param storedHash - Stored password hash
 * @returns True if password matches, false otherwise
 */
function verifyPassword(password: string, storedHash: string): boolean {
  const hashedPassword = hashPassword(password);
  return hashedPassword === storedHash;
}

/**
 * Generate JWT token
 * @param userId - User ID
 * @param email - User email
 * @param membershipType - Membership type
 * @returns JWT token
 */
function generateToken(userId: string, email: string, membershipType: string): string {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId,
    email,
    membershipType,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
  });
}

/**
 * Calculate token expiration time in seconds
 * @returns Expiration time in seconds
 */
function getExpirationTime(): number {
  const expiration = JWT_EXPIRATION;
  
  if (typeof expiration === 'string') {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (match) {
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
          return 86400; // Default to 24 hours
      }
    }
  }
  
  return 86400; // Default to 24 hours
}

/**
 * Create API Gateway response
 * @param statusCode - HTTP status code
 * @param body - Response body
 * @returns API Gateway proxy result
 */
function createResponse(statusCode: number, body: LoginResponse | ErrorResponse): APIGatewayProxyResult {
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
}

/**
 * Lambda handler for member login
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Login request received:', {
    path: event.path,
    method: event.httpMethod,
    requestId: event.requestContext.requestId,
  });

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, { error: '', message: 'OK' });
  }

  // Validate HTTP method
  if (event.httpMethod !== 'POST') {
    return createResponse(405, {
      error: 'Method Not Allowed',
      message: 'Only POST requests are allowed',
    });
  }

  try {
    // Parse request body
    let requestBody: LoginRequest;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Invalid JSON in request body',
      });
    }

    // Validate request
    const validation = validateLoginRequest(requestBody);
    if (!validation.valid) {
      return createResponse(400, {
        error: 'Validation Error',
        message: validation.error || 'Invalid request',
      });
    }

    const { email, password } = requestBody;

    // Retrieve member from database
    const member = await getMemberByEmail(email);

    if (!member) {
      // Return generic error to prevent email enumeration
      return createResponse(401, {
        error: 'Authentication Failed',
        message: 'Invalid email or password',
      });
    }

    // Check if account is active
    if (member.status !== 'active') {
      return createResponse(403, {
        error: 'Account Inactive',
        message: 'Your account is not active. Please contact support.',
      });
    }

    // Verify password
    const isPasswordValid = verifyPassword(password, member.passwordHash);

    if (!isPasswordValid) {
      return createResponse(401, {
        error: 'Authentication Failed',
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = generateToken(member.id, member.email, member.membershipType || 'standard');
    const expiresIn = getExpirationTime();

    // Prepare success response
    const response: LoginResponse = {
      token,
      expiresIn,
      user: {
        id: member.id,
        email: member.email,
        membershipType: member.membershipType || 'standard',
      },
    };

    console.log('Login successful:', {
      userId: member.id,
      email: member.email,
      requestId: event.requestContext.requestId,
    });

    return createResponse(200, response);
  } catch (error) {
    console.error('Login error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message === 'Database error') {
        return createResponse(503, {
          error: 'Service Unavailable',
          message: 'Unable to process request. Please try again later.',
        });
      }
    }

    // Generic error response
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred. Please try again later.',
    });
  }
}
```