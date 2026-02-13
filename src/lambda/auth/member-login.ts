import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

/**
 * Environment variables required for the Lambda function
 */
interface EnvironmentVariables {
  JWT_SECRET: string;
  JWT_EXPIRATION: string;
  DYNAMODB_TABLE_NAME: string;
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
 * Member data structure from database
 */
interface MemberData {
  id: string;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  membershipStatus: string;
  createdAt: string;
  lastLogin?: string;
}

/**
 * JWT payload structure
 */
interface JWTPayload {
  memberId: string;
  email: string;
  membershipStatus: string;
  iat?: number;
  exp?: number;
}

/**
 * Success response structure
 */
interface LoginSuccessResponse {
  success: true;
  token: string;
  member: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    membershipStatus: string;
  };
  expiresIn: string;
}

/**
 * Error response structure
 */
interface LoginErrorResponse {
  success: false;
  error: string;
  message: string;
}

/**
 * Validates the login request body
 * @param body - Request body to validate
 * @returns Parsed login request or null if invalid
 */
const validateLoginRequest = (body: string | null): LoginRequest | null => {
  if (!body) {
    return null;
  }

  try {
    const parsed = JSON.parse(body);
    
    if (!parsed.email || !parsed.password) {
      return null;
    }

    // Basic email validation
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
 * Retrieves member data from DynamoDB
 * @param email - Member email address
 * @returns Member data or null if not found
 */
const getMemberByEmail = async (email: string): Promise<MemberData | null> => {
  const AWS = await import('aws-sdk');
  const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  const params = {
    TableName: process.env.DYNAMODB_TABLE_NAME || 'members',
    IndexName: 'EmailIndex',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email,
    },
  };

  try {
    const result = await dynamodb.query(params).promise();
    
    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return result.Items[0] as MemberData;
  } catch (error) {
    console.error('Error querying DynamoDB:', error);
    throw new Error('Database query failed');
  }
};

/**
 * Updates the last login timestamp for a member
 * @param memberId - Member ID
 */
const updateLastLogin = async (memberId: string): Promise<void> => {
  const AWS = await import('aws-sdk');
  const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  const params = {
    TableName: process.env.DYNAMODB_TABLE_NAME || 'members',
    Key: { id: memberId },
    UpdateExpression: 'SET lastLogin = :lastLogin',
    ExpressionAttributeValues: {
      ':lastLogin': new Date().toISOString(),
    },
  };

  try {
    await dynamodb.update(params).promise();
  } catch (error) {
    console.error('Error updating last login:', error);
    // Non-critical error, don't throw
  }
};

/**
 * Verifies password against stored hash
 * @param password - Plain text password
 * @param hash - Stored password hash
 * @returns True if password matches
 */
const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
};

/**
 * Generates JWT token for authenticated member
 * @param member - Member data
 * @returns JWT token string
 */
const generateToken = (member: MemberData): string => {
  const payload: JWTPayload = {
    memberId: member.id,
    email: member.email,
    membershipStatus: member.membershipStatus,
  };

  const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
  const expiresIn = process.env.JWT_EXPIRATION || '24h';

  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Creates a standardized API Gateway response
 * @param statusCode - HTTP status code
 * @param body - Response body
 * @returns API Gateway proxy result
 */
const createResponse = (
  statusCode: number,
  body: LoginSuccessResponse | LoginErrorResponse
): APIGatewayProxyResult => {
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
 * Lambda handler for member login authentication
 * Validates credentials and returns JWT token on success
 * 
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with token or error
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Member login request received', {
    path: event.path,
    method: event.httpMethod,
  });

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {
      success: true,
      token: '',
      member: { id: '', email: '', membershipStatus: '' },
      expiresIn: '',
    });
  }

  // Validate HTTP method
  if (event.httpMethod !== 'POST') {
    return createResponse(405, {
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Only POST method is allowed',
    });
  }

  try {
    // Validate request body
    const loginRequest = validateLoginRequest(event.body);
    
    if (!loginRequest) {
      return createResponse(400, {
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Invalid email or password format',
      });
    }

    // Retrieve member from database
    const member = await getMemberByEmail(loginRequest.email);
    
    if (!member) {
      // Use generic error message to prevent email enumeration
      return createResponse(401, {
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(
      loginRequest.password,
      member.passwordHash
    );

    if (!isPasswordValid) {
      return createResponse(401, {
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    // Check membership status
    if (member.membershipStatus === 'suspended' || member.membershipStatus === 'inactive') {
      return createResponse(403, {
        success: false,
        error: 'ACCOUNT_SUSPENDED',
        message: 'Your account is currently suspended. Please contact support.',
      });
    }

    // Generate JWT token
    const token = generateToken(member);

    // Update last login timestamp (non-blocking)
    updateLastLogin(member.id).catch((error) => {
      console.error('Failed to update last login:', error);
    });

    // Return success response
    const response: LoginSuccessResponse = {
      success: true,
      token,
      member: {
        id: member.id,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        membershipStatus: member.membershipStatus,
      },
      expiresIn: process.env.JWT_EXPIRATION || '24h',
    };

    console.log('Login successful', {
      memberId: member.id,
      email: member.email,
    });

    return createResponse(200, response);

  } catch (error) {
    console.error('Login error:', error);

    // Return generic error to client
    return createResponse(500, {
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An error occurred during login. Please try again later.',
    });
  }
};
```