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
interface AuthenticationResponse {
  success: boolean;
  token?: string;
  message?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

/**
 * Validates the login request body
 * @param body - The parsed request body
 * @returns True if valid, false otherwise
 */
const validateLoginRequest = (body: any): body is LoginRequest => {
  return (
    body &&
    typeof body.email === 'string' &&
    body.email.length > 0 &&
    typeof body.password === 'string' &&
    body.password.length > 0
  );
};

/**
 * Validates email format
 * @param email - Email address to validate
 * @returns True if valid email format
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Authenticates user credentials
 * @param email - User email
 * @param password - User password
 * @returns Authentication response with token if successful
 */
const authenticateUser = async (
  email: string,
  password: string
): Promise<AuthenticationResponse> => {
  try {
    // TODO: Implement actual authentication logic
    // This should integrate with your authentication service (e.g., Cognito, custom auth)
    // For now, this is a placeholder implementation
    
    // Validate email format
    if (!isValidEmail(email)) {
      return {
        success: false,
        message: 'Invalid email format',
      };
    }

    // Simulate authentication check
    // Replace this with actual authentication service call
    const isAuthenticated = await verifyCredentials(email, password);

    if (!isAuthenticated) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }

    // Generate or retrieve authentication token
    const token = await generateAuthToken(email);

    return {
      success: true,
      token,
      user: {
        id: generateUserId(email),
        email,
        name: extractNameFromEmail(email),
      },
    };
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};

/**
 * Verifies user credentials against authentication service
 * @param email - User email
 * @param password - User password
 * @returns True if credentials are valid
 */
const verifyCredentials = async (
  email: string,
  password: string
): Promise<boolean> => {
  // TODO: Implement actual credential verification
  // This should call your authentication service (AWS Cognito, custom DB, etc.)
  
  // Placeholder implementation
  // In production, this should verify against your user database or auth service
  return password.length >= 8;
};

/**
 * Generates authentication token for user
 * @param email - User email
 * @returns JWT or session token
 */
const generateAuthToken = async (email: string): Promise<string> => {
  // TODO: Implement actual token generation
  // This should generate a JWT or session token
  
  // Placeholder implementation
  const timestamp = Date.now();
  const tokenPayload = Buffer.from(
    JSON.stringify({ email, timestamp })
  ).toString('base64');
  
  return `token_${tokenPayload}`;
};

/**
 * Generates a user ID from email
 * @param email - User email
 * @returns User ID
 */
const generateUserId = (email: string): string => {
  // TODO: Replace with actual user ID lookup from database
  return Buffer.from(email).toString('base64').substring(0, 16);
};

/**
 * Extracts name from email address
 * @param email - User email
 * @returns Extracted name or empty string
 */
const extractNameFromEmail = (email: string): string => {
  const localPart = email.split('@')[0];
  return localPart
    .split(/[._-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

/**
 * Creates a standardized API response
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
 * Lambda handler for member benefits authentication
 * Processes login form submission and returns authentication response
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
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, { message: 'OK' });
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

    let requestBody: any;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      return createResponse(400, {
        success: false,
        message: 'Invalid JSON in request body',
      });
    }

    // Validate login request structure
    if (!validateLoginRequest(requestBody)) {
      return createResponse(400, {
        success: false,
        message: 'Email and password are required',
      });
    }

    // Authenticate user
    const authResponse = await authenticateUser(
      requestBody.email.trim().toLowerCase(),
      requestBody.password
    );

    // Return appropriate response based on authentication result
    if (authResponse.success) {
      console.log('Authentication successful for user:', requestBody.email);
      return createResponse(200, authResponse);
    } else {
      console.log('Authentication failed for user:', requestBody.email);
      return createResponse(401, authResponse);
    }
  } catch (error) {
    console.error('Unexpected error during authentication:', error);
    
    return createResponse(500, {
      success: false,
      message: 'An unexpected error occurred during authentication',
    });
  }
};
```