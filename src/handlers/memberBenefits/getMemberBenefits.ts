import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Interface representing a member benefit
 */
interface MemberBenefit {
  id: string;
  title: string;
  description: string;
  category: string;
  icon?: string;
  isActive: boolean;
  displayOrder: number;
  eligibilityRequirements?: string[];
  expirationDate?: string;
  termsAndConditions?: string;
}

/**
 * Response structure for member benefits
 */
interface MemberBenefitsResponse {
  benefits: MemberBenefit[];
  totalCount: number;
  timestamp: string;
}

/**
 * Error response structure
 */
interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

/**
 * Creates a standardized API Gateway response
 * 
 * @param statusCode - HTTP status code
 * @param body - Response body object
 * @returns Formatted API Gateway response
 */
const createResponse = (statusCode: number, body: MemberBenefitsResponse | ErrorResponse): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify(body),
  };
};

/**
 * Creates an error response
 * 
 * @param statusCode - HTTP status code
 * @param error - Error type
 * @param message - Error message
 * @returns Formatted error response
 */
const createErrorResponse = (statusCode: number, error: string, message: string): APIGatewayProxyResult => {
  const errorResponse: ErrorResponse = {
    error,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  };
  return createResponse(statusCode, errorResponse);
};

/**
 * Retrieves member benefits data
 * This is a placeholder implementation that returns mock data
 * In production, this would fetch from DynamoDB or another data source
 * 
 * @returns Array of member benefits
 */
const fetchMemberBenefits = async (): Promise<MemberBenefit[]> => {
  // TODO: Replace with actual database query (DynamoDB, RDS, etc.)
  // Example: const result = await dynamoDb.scan({ TableName: 'MemberBenefits' }).promise();
  
  const mockBenefits: MemberBenefit[] = [
    {
      id: '1',
      title: 'Premium Support',
      description: 'Access to 24/7 premium customer support with dedicated account managers',
      category: 'Support',
      icon: 'support',
      isActive: true,
      displayOrder: 1,
      eligibilityRequirements: ['Active membership', 'Premium tier'],
      termsAndConditions: 'Subject to availability and standard terms of service',
    },
    {
      id: '2',
      title: 'Exclusive Discounts',
      description: 'Up to 20% off on all products and services',
      category: 'Savings',
      icon: 'discount',
      isActive: true,
      displayOrder: 2,
      eligibilityRequirements: ['Active membership'],
      termsAndConditions: 'Discounts cannot be combined with other offers',
    },
    {
      id: '3',
      title: 'Early Access',
      description: 'Get early access to new features and products before general release',
      category: 'Access',
      icon: 'early-access',
      isActive: true,
      displayOrder: 3,
      eligibilityRequirements: ['Active membership', 'Email verification'],
      termsAndConditions: 'Early access features are subject to change',
    },
    {
      id: '4',
      title: 'Free Shipping',
      description: 'Enjoy free shipping on all orders with no minimum purchase',
      category: 'Savings',
      icon: 'shipping',
      isActive: true,
      displayOrder: 4,
      eligibilityRequirements: ['Active membership'],
      termsAndConditions: 'Applies to standard shipping only',
    },
    {
      id: '5',
      title: 'Member Events',
      description: 'Invitations to exclusive member-only events and webinars',
      category: 'Events',
      icon: 'events',
      isActive: true,
      displayOrder: 5,
      eligibilityRequirements: ['Active membership', 'Event registration'],
      termsAndConditions: 'Event attendance subject to capacity and registration',
    },
  ];

  // Simulate async operation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockBenefits.filter(benefit => benefit.isActive).sort((a, b) => a.displayOrder - b.displayOrder));
    }, 100);
  });
};

/**
 * Lambda handler for retrieving member benefits
 * Implements GET endpoint with proper error handling and response formatting
 * 
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with member benefits data or error
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    // Handle OPTIONS request for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {
        benefits: [],
        totalCount: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Validate HTTP method
    if (event.httpMethod !== 'GET') {
      console.warn(`Invalid HTTP method: ${event.httpMethod}`);
      return createErrorResponse(
        405,
        'MethodNotAllowed',
        `Method ${event.httpMethod} is not allowed. Only GET requests are supported.`
      );
    }

    // Optional: Extract and validate query parameters
    const queryParams = event.queryStringParameters || {};
    const category = queryParams.category;
    
    console.log('Fetching member benefits...');
    
    // Fetch benefits data
    let benefits = await fetchMemberBenefits();

    // Optional: Filter by category if provided
    if (category) {
      console.log(`Filtering benefits by category: ${category}`);
      benefits = benefits.filter(benefit => 
        benefit.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Prepare response
    const response: MemberBenefitsResponse = {
      benefits,
      totalCount: benefits.length,
      timestamp: new Date().toISOString(),
    };

    console.log(`Successfully retrieved ${benefits.length} member benefits`);
    
    return createResponse(200, response);

  } catch (error) {
    console.error('Error retrieving member benefits:', error);

    // Handle specific error types
    if (error instanceof Error) {
      return createErrorResponse(
        500,
        'InternalServerError',
        `Failed to retrieve member benefits: ${error.message}`
      );
    }

    // Handle unknown errors
    return createErrorResponse(
      500,
      'InternalServerError',
      'An unexpected error occurred while retrieving member benefits'
    );
  }
};
```