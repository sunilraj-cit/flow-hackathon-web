import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Interface for login request body
 */
interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Interface for authentication response
 */
interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

/**
 * Validates email format
 * @param email - Email address to validate
 * @returns True if email is valid, false otherwise
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates login request body
 * @param body - Request body to validate
 * @returns Validation result with error message if invalid
 */
const validateLoginRequest = (body: any): { valid: boolean; error?: string } => {
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

  if (body.password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long' };
  }

  return { valid: true };
};

/**
 * Authenticates user credentials
 * @param email - User email
 * @param password - User password
 * @returns Authentication result with user data and token
 */
const authenticateUser = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  try {
    // TODO: Implement actual authentication logic
    // This should integrate with your authentication service (e.g., Cognito, DynamoDB, etc.)
    // For now, this is a placeholder implementation
    
    // Example: Query user from database
    // const user = await getUserByEmail(email);
    // if (!user) {
    //   return { success: false, message: 'Invalid credentials' };
    // }
    
    // Example: Verify password
    // const isPasswordValid = await verifyPassword(password, user.passwordHash);
    // if (!isPasswordValid) {
    //   return { success: false, message: 'Invalid credentials' };
    // }
    
    // Example: Generate JWT token
    // const token = await generateToken(user);
    
    // Placeholder response
    return {
      success: true,
      message: 'Authentication successful',
      token: 'placeholder-jwt-token',
      user: {
        id: 'user-id-placeholder',
        email: email,
        name: 'User Name',
      },
    };
  } catch (error) {
    console.error('Authentication error:', error);
    throw new Error('Authentication failed');
  }
};

/**
 * Creates API Gateway response
 * @param statusCode - HTTP status code
 * @param body - Response body
 * @returns API Gateway proxy result
 */
const createResponse = (
  statusCode: number,
  body: Record<string, any>
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'OPTIONS,POST',
    },
    body: JSON.stringify(body),
  };
};

/**
 * Lambda handler for authentication
 * Processes login form submission and handles authentication logic
 * 
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with authentication response
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Authentication request received:', {
    path: event.path,
    method: event.httpMethod,
    requestId: event.requestContext.requestId,
  });

  try {
    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, { message: 'OK' });
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return createResponse(405, {
        success: false,
        message: 'Method not allowed',
      });
    }

    // Parse request body
    let requestBody: LoginRequest;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return createResponse(400, {
        success: false,
        message: 'Invalid JSON in request body',
      });
    }

    // Validate request
    const validation = validateLoginRequest(requestBody);
    if (!validation.valid) {
      return createResponse(400, {
        success: false,
        message: validation.error,
      });
    }

    // Authenticate user
    const authResult = await authenticateUser(
      requestBody.email.toLowerCase().trim(),
      requestBody.password
    );

    if (!authResult.success) {
      return createResponse(401, {
        success: false,
        message: authResult.message,
      });
    }

    // Return success response
    return createResponse(200, {
      success: true,
      message: authResult.message,
      token: authResult.token,
      user: authResult.user,
    });
  } catch (error) {
    console.error('Unexpected error in authentication handler:', error);
    
    return createResponse(500, {
      success: false,
      message: 'Internal server error',
    });
  }
};