import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const USERS_TABLE = process.env.USERS_TABLE || 'member-benefits-users';
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';

interface LoginRequest {
  email: string;
  password: string;
}

interface UserRecord {
  email: string;
  passwordHash: string;
  salt: string;
  firstName?: string;
  lastName?: string;
  memberId?: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
}

interface TokenPayload {
  email: string;
  memberId?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Hash password with salt using PBKDF2
 * @param password - Plain text password
 * @param salt - Salt for hashing
 * @returns Hashed password
 */
const hashPassword = (password: string, salt: string): string => {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
};

/**
 * Verify password against stored hash
 * @param password - Plain text password to verify
 * @param hash - Stored password hash
 * @param salt - Salt used for hashing
 * @returns True if password matches
 */
const verifyPassword = (password: string, hash: string, salt: string): boolean => {
  const passwordHash = hashPassword(password, salt);
  return passwordHash === hash;
};

/**
 * Generate JWT token for authenticated user
 * @param payload - Token payload data
 * @returns JWT token string
 */
const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
    issuer: 'member-benefits-auth',
  });
};

/**
 * Validate login request body
 * @param body - Request body to validate
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
 * Retrieve user from DynamoDB by email
 * @param email - User email address
 * @returns User record or null if not found
 */
const getUserByEmail = async (email: string): Promise<UserRecord | null> => {
  try {
    const command = new GetCommand({
      TableName: USERS_TABLE,
      Key: {
        email,
      },
    });

    const response = await docClient.send(command);
    
    if (!response.Item) {
      return null;
    }

    return response.Item as UserRecord;
  } catch (error) {
    console.error('Error retrieving user from DynamoDB:', error);
    throw error;
  }
};

/**
 * Update user's last login timestamp
 * @param email - User email address
 */
const updateLastLogin = async (email: string): Promise<void> => {
  try {
    const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
    const command = new UpdateCommand({
      TableName: USERS_TABLE,
      Key: {
        email,
      },
      UpdateExpression: 'SET lastLoginAt = :timestamp',
      ExpressionAttributeValues: {
        ':timestamp': new Date().toISOString(),
      },
    });

    await docClient.send(command);
  } catch (error) {
    console.error('Error updating last login:', error);
  }
};

/**
 * Create API Gateway response
 * @param statusCode - HTTP status code
 * @param body - Response body object
 * @returns API Gateway proxy result
 */
const createResponse = (statusCode: number, body: Record<string, unknown>): APIGatewayProxyResult => {
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
 * Lambda handler for member benefits login
 * Validates credentials and returns JWT token on success
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with token or error
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Login request received:', {
    path: event.path,
    method: event.httpMethod,
    sourceIp: event.requestContext.identity.sourceIp,
  });

  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, { message: 'OK' });
  }

  if (event.httpMethod !== 'POST') {
    return createResponse(405, {
      error: 'Method not allowed',
      message: 'Only POST requests are supported',
    });
  }

  try {
    const loginRequest = validateLoginRequest(event.body);

    if (!loginRequest) {
      return createResponse(400, {
        error: 'Invalid request',
        message: 'Email and password are required and must be valid',
      });
    }

    const user = await getUserByEmail(loginRequest.email);

    if (!user) {
      console.warn('Login attempt for non-existent user:', loginRequest.email);
      return createResponse(401, {
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
    }

    if (user.status !== 'active') {
      console.warn('Login attempt for inactive user:', loginRequest.email);
      return createResponse(403, {
        error: 'Account inactive',
        message: 'Your account is not active. Please contact support.',
      });
    }

    const isPasswordValid = verifyPassword(loginRequest.password, user.passwordHash, user.salt);

    if (!isPasswordValid) {
      console.warn('Invalid password attempt for user:', loginRequest.email);
      return createResponse(401, {
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
    }

    const tokenPayload: TokenPayload = {
      email: user.email,
      memberId: user.memberId,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const token = generateToken(tokenPayload);

    await updateLastLogin(user.email);

    console.log('Successful login for user:', loginRequest.email);

    return createResponse(200, {
      success: true,
      token,
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        memberId: user.memberId,
      },
    });
  } catch (error) {
    console.error('Error processing login request:', error);

    return createResponse(500, {
      error: 'Internal server error',
      message: 'An error occurred while processing your request',
    });
  }
};