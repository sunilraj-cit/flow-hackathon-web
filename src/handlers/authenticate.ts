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

  if (body.password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
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
    // This should integrate with your authentication service (Cognito, Auth0, etc.)
    // For now, this is a placeholder implementation
    
    // Example: Query DynamoDB for user
    // Example: Verify password hash
    // Example: Generate JWT token
    
    // Placeholder response - replace with actual authentication
    if (email && password) {
      // Simulate authentication delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // This is a mock response - replace with real authentication
      return {
        success: true,
        message: 'Authentication successful',
        token: 'mock-jwt-token', // Replace with actual JWT generation
        user: {
          id: 'user-123',
          email: email,
          name: 'Member User'
        }
      };
    }

    return {
      success: false,
      message: 'Invalid credentials'
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
 * @returns Formatted API Gateway response
 */
const createResponse = (
  statusCode: number,
  body: AuthResponse | { error: string }
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    body: JSON.stringify(body)
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
  console.log('Authentication request received', {
    path: event.path,
    method: event.httpMethod,
    requestId: event.requestContext.requestId
  });

  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, { error: '' });
    }

    // Validate HTTP method
    if (event.httpMethod !== 'POST') {
      return createResponse(405, {
        error: 'Method not allowed. Use POST for authentication.'
      });
    }

    // Parse request body
    let requestBody: LoginRequest;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return createResponse(400, {
        error: 'Invalid JSON in request body'
      });
    }

    // Validate request
    const validation = validateLoginRequest(requestBody);
    if (!validation.valid) {
      console.warn('Validation failed:', validation.error);
      return createResponse(400, {
        error: validation.error || 'Invalid request'
      });
    }

    // Sanitize email
    const email = requestBody.email.trim().toLowerCase();
    const password = requestBody.password;

    // Authenticate user
    const authResult = await authenticateUser(email, password);

    if (!authResult.success) {
      console.warn('Authentication failed for email:', email);
      return createResponse(401, {
        error: authResult.message
      });
    }

    console.log('Authentication successful for email:', email);

    // Return success response
    return createResponse(200, authResult);

  } catch (error) {
    console.error('Unexpected error in authentication handler:', error);
    
    return createResponse(500, {
      error: 'Internal server error. Please try again later.'
    });
  }
};

/**
 * Export handler as default for Lambda
 */
export default handler;
```