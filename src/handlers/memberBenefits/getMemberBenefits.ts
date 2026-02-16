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
  createdAt: string;
  updatedAt: string;
}

/**
 * Response structure for member benefits
 */
interface MemberBenefitsResponse {
  benefits: MemberBenefit[];
  total: number;
  timestamp: string;
}

/**
 * Error response structure
 */
interface ErrorResponse {
  error: string;
  message: string;
  timestamp: string;
}

/**
 * Creates a standardized API Gateway response
 * 
 * @param statusCode - HTTP status code
 * @param body - Response body object
 * @returns Formatted API Gateway response
 */
const createResponse = (
  statusCode: number,
  body: MemberBenefitsResponse | ErrorResponse
): APIGatewayProxyResult => {
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
const createErrorResponse = (
  statusCode: number,
  error: string,
  message: string
): APIGatewayProxyResult => {
  return createResponse(statusCode, {
    error,
    message,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Fetches member benefits data
 * This is a placeholder implementation that returns mock data.
 * In production, this would fetch from DynamoDB or another data source.
 * 
 * @returns Promise resolving to array of member benefits
 */
const fetchMemberBenefits = async (): Promise<MemberBenefit[]> => {
  // TODO: Replace with actual database query (DynamoDB, RDS, etc.)
  // Example: const result = await dynamoDb.scan({ TableName: 'MemberBenefits' }).promise();
  
  const mockBenefits: MemberBenefit[] = [
    {
      id: '1',
      title: 'Exclusive Discounts',
      description: 'Get up to 20% off on premium products and services',
      category: 'Shopping',
      icon: 'discount',
      isActive: true,
      displayOrder: 1,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '2',
      title: 'Priority Support',
      description: '24/7 dedicated customer support with priority response',
      category: 'Support',
      icon: 'support',
      isActive: true,
      displayOrder: 2,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '3',
      title: 'Early Access',
      description: 'Be the first to access new features and products',
      category: 'Access',
      icon: 'early-access',
      isActive: true,
      displayOrder: 3,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '4',
      title: 'Free Shipping',
      description: 'Enjoy free shipping on all orders, no minimum purchase required',
      category: 'Shopping',
      icon: 'shipping',
      isActive: true,
      displayOrder: 4,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '5',
      title: 'Rewards Program',
      description: 'Earn points on every purchase and redeem for exclusive rewards',
      category: 'Rewards',
      icon: 'rewards',
      isActive: true,
      displayOrder: 5,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ];

  // Simulate async operation
  return Promise.resolve(mockBenefits.filter(benefit => benefit.isActive));
};

/**
 * Lambda handler for retrieving member benefits
 * Implements GET endpoint with error handling and response formatting
 * 
 * @param event - API Gateway proxy event
 * @returns Promise resolving to API Gateway proxy result
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    // Handle OPTIONS request for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {
        benefits: [],
        total: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Validate HTTP method
    if (event.httpMethod !== 'GET') {
      return createErrorResponse(
        405,
        'MethodNotAllowed',
        `Method ${event.httpMethod} is not allowed. Only GET requests are supported.`
      );
    }

    // Fetch member benefits
    const benefits = await fetchMemberBenefits();

    // Sort benefits by display order
    const sortedBenefits = benefits.sort(
      (a, b) => a.displayOrder - b.displayOrder
    );

    // Prepare response
    const response: MemberBenefitsResponse = {
      benefits: sortedBenefits,
      total: sortedBenefits.length,
      timestamp: new Date().toISOString(),
    };

    console.log(`Successfully retrieved ${response.total} member benefits`);

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