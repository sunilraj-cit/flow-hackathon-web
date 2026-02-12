import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

/**
 * Environment variables required for the handler
 */
interface EnvironmentVariables {
  JWT_SECRET: string;
  JWT_EXPIRATION?: string;
  MEMBER_TABLE_NAME: string;
  AWS_REGION: string;
}

/**
 * Login request body structure
 */
interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Member database record structure
 */
interface MemberRecord {
  memberId: string;
  email: string;
  passwordHash: string;
  salt: string;
  firstName: string;
  lastName: string;
  membershipStatus: 'active' | 'inactive' | 'suspended';
  membershipTier: string;
  createdAt: string;
  lastLoginAt?: string;
}

/**
 * JWT token payload structure
 */
interface TokenPayload {
  memberId: string;
  email: string;
  firstName: string;
  lastName: string;
  membershipStatus: string;
  membershipTier: string;
}

/**
 * Authentication response structure
 */
interface AuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  member?: {
    memberId: string;
    email: string;
    firstName: string;
    lastName: string;
    membershipStatus: string;
    membershipTier: string;
  };
  message?: string;
}

/**
 * Validates environment variables
 * @throws {Error} If required environment variables are missing
 */
function validateEnvironment(): EnvironmentVariables {
  const { JWT_SECRET, JWT_EXPIRATION, MEMBER_TABLE_NAME, AWS_REGION } = process.env;

  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  if (!MEMBER_TABLE_NAME) {
    throw new Error('MEMBER_TABLE_NAME environment variable is required');
  }

  if (!AWS_REGION) {
    throw new Error('AWS_REGION environment variable is required');
  }

  return {
    JWT_SECRET,
    JWT_EXPIRATION: JWT_EXPIRATION || '24h',
    MEMBER_TABLE_NAME,
    AWS_REGION,
  };
}

/**
 * Parses and validates the request body
 * @param body - Raw request body string
 * @returns Parsed login request
 * @throws {Error} If body is invalid
 */
function parseRequestBody(body: string | null): LoginRequest {
  if (!body) {
    throw new Error('Request body is required');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(body);
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }

  const { email, password } = parsed;

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

  return { email: email.toLowerCase().trim(), password };
}

/**
 * Retrieves member record from DynamoDB
 * @param email - Member email address
 * @param tableName - DynamoDB table name
 * @returns Member record or null if not found
 */
async function getMemberByEmail(email: string, tableName: string): Promise<MemberRecord | null> {
  // Note: In production, use AWS SDK v3
  const AWS = require('aws-sdk');
  const dynamodb = new AWS.DynamoDB.DocumentClient();

  try {
    const result = await dynamodb
      .query({
        TableName: tableName,
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email,
        },
        Limit: 1,
      })
      .promise();

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return result.Items[0] as MemberRecord;
  } catch (error) {
    console.error('Error querying member by email:', error);
    throw new Error('Database query failed');
  }
}

/**
 * Hashes password with salt using PBKDF2
 * @param password - Plain text password
 * @param salt - Salt string
 * @returns Hashed password
 */
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

/**
 * Verifies password against stored hash
 * @param password - Plain text password
 * @param hash - Stored password hash
 * @param salt - Salt used for hashing
 * @returns True if password matches
 */
function verifyPassword(password: string, hash: string, salt: string): boolean {
  const passwordHash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(passwordHash));
}

/**
 * Generates JWT access token
 * @param payload - Token payload
 * @param secret - JWT secret
 * @param expiresIn - Token expiration time
 * @returns Signed JWT token
 */
function generateAccessToken(payload: TokenPayload, secret: string, expiresIn: string): string {
  return jwt.sign(payload, secret, {
    expiresIn,
    issuer: 'member-benefits-auth',
    audience: 'member-benefits-portal',
  });
}

/**
 * Generates JWT refresh token
 * @param memberId - Member ID
 * @param secret - JWT secret
 * @returns Signed refresh token
 */
function generateRefreshToken(memberId: string, secret: string): string {
  return jwt.sign(
    { memberId, type: 'refresh' },
    secret,
    {
      expiresIn: '7d',
      issuer: 'member-benefits-auth',
      audience: 'member-benefits-portal',
    }
  );
}

/**
 * Updates member's last login timestamp
 * @param memberId - Member ID
 * @param tableName - DynamoDB table name
 */
async function updateLastLogin(memberId: string, tableName: string): Promise<void> {
  const AWS = require('aws-sdk');
  const dynamodb = new AWS.DynamoDB.DocumentClient();

  try {
    await dynamodb
      .update({
        TableName: tableName,
        Key: { memberId },
        UpdateExpression: 'SET lastLoginAt = :timestamp',
        ExpressionAttributeValues: {
          ':timestamp': new Date().toISOString(),
        },
      })
      .promise();
  } catch (error) {
    console.error('Error updating last login:', error);
    // Non-critical error, don't throw
  }
}

/**
 * Creates a standardized API Gateway response
 * @param statusCode - HTTP status code
 * @param body - Response body object
 * @returns API Gateway proxy result
 */
function createResponse(statusCode: number, body: AuthResponse): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

/**
 * Lambda handler for member benefits authentication
 * Processes login credentials, validates against member database, and returns JWT tokens
 * 
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with authentication response
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Member benefits auth handler invoked', {
    httpMethod: event.httpMethod,
    path: event.path,
  });

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, { success: true });
  }

  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return createResponse(405, {
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    // Validate environment
    const env = validateEnvironment();

    // Parse and validate request body
    const { email, password } = parseRequestBody(event.body);

    console.log('Processing login request for email:', email);

    // Retrieve member record
    const member = await getMemberByEmail(email, env.MEMBER_TABLE_NAME);

    if (!member) {
      console.log('Member not found:', email);
      return createResponse(401, {
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check membership status
    if (member.membershipStatus !== 'active') {
      console.log('Member account not active:', email, member.membershipStatus);
      return createResponse(403, {
        success: false,
        message: `Account is ${member.membershipStatus}. Please contact support.`,
      });
    }

    // Verify password
    const isPasswordValid = verifyPassword(password, member.passwordHash, member.salt);

    if (!isPasswordValid) {
      console.log('Invalid password for member:', email);
      return createResponse(401, {
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      memberId: member.memberId,
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      membershipStatus: member.membershipStatus,
      membershipTier: member.membershipTier,
    };

    const accessToken = generateAccessToken(tokenPayload, env.JWT_SECRET, env.JWT_EXPIRATION!);
    const refreshToken = generateRefreshToken(member.memberId, env.JWT_SECRET);

    // Update last login timestamp (non-blocking)
    updateLastLogin(member.memberId, env.MEMBER_TABLE_NAME).catch((error) => {
      console.error('Failed to update last login:', error);
    });

    console.log('Login successful for member:', email);

    // Return success response
    return createResponse(200, {
      success: true,
      token: accessToken,
      refreshToken,
      expiresIn: 86400, // 24 hours in seconds
      member: {
        memberId: member.memberId,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        membershipStatus: member.membershipStatus,
        membershipTier: member.membershipTier,
      },
    });
  } catch (error) {
    console.error('Authentication error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';

    // Don't expose internal errors to client
    const clientMessage = errorMessage.includes('Database') || errorMessage.includes('environment')
      ? 'Internal server error'
      : errorMessage;

    return createResponse(
      errorMessage.includes('required') || errorMessage.includes('Invalid') ? 400 : 500,
      {
        success: false,
        message: clientMessage,
      }
    );
  }
}
```