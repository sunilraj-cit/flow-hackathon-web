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
  eligibilityTier?: string;
  externalLink?: string;
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
 * Fetches member benefits from data source
 * In production, this would query DynamoDB, RDS, or another data store
 * 
 * @returns Promise resolving to array of member benefits
 */
const fetchMemberBenefits = async (): Promise<MemberBenefit[]> => {
  // TODO: Replace with actual database query
  // Example: const result = await dynamoDb.scan({ TableName: process.env.BENEFITS_TABLE_NAME }).promise();
  
  const mockBenefits: MemberBenefit[] = [
    {
      id: '1',
      title: 'Exclusive Discounts',
      description: 'Get up to 20% off on partner services and products',
      category: 'Shopping',
      icon: 'discount',
      isActive: true,
      displayOrder: 1,
      eligibilityTier: 'Basic',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Priority Support',
      description: '24/7 dedicated customer support with priority queue',
      category: 'Support',
      icon: 'support',
      isActive: true,
      displayOrder: 2,
      eligibilityTier: 'Premium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '3',
      title: 'Early Access',
      description: 'Be the first to access new features and products',
      category: 'Features',
      icon: 'star',
      isActive: true,
      displayOrder: 3,
      eligibilityTier: 'Premium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '4',
      title: 'Free Shipping',
      description: 'Enjoy free shipping on all orders',
      category: 'Shopping',
      icon: 'shipping',
      isActive: true,
      displayOrder: 4,
      eligibilityTier: 'Basic',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return mockBenefits;
};

/**
 * Lambda handler for GET /member-benefits endpoint
 * Retrieves and returns member benefits data with proper error handling
 * 
 * @param event - API Gateway proxy event
 * @returns Promise resolving to API Gateway proxy result
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
      return createResponse(405, {
        error: 'Method Not Allowed',
        message: `HTTP method ${event.httpMethod} is not supported. Use GET.`,
        timestamp: new Date().toISOString(),
      });
    }

    // Extract query parameters for potential filtering
    const queryParams = event.queryStringParameters || {};
    const category = queryParams.category;
    const tier = queryParams.tier;

    console.log('Fetching member benefits with filters:', { category, tier });

    // Fetch benefits from data source
    let benefits = await fetchMemberBenefits();

    // Apply filters if provided
    if (category) {
      benefits = benefits.filter(
        (benefit) => benefit.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (tier) {
      benefits = benefits.filter(
        (benefit) => benefit.eligibilityTier?.toLowerCase() === tier.toLowerCase()
      );
    }

    // Filter only active benefits
    benefits = benefits.filter((benefit) => benefit.isActive);

    // Sort by display order
    benefits.sort((a, b) => a.displayOrder - b.displayOrder);

    const response: MemberBenefitsResponse = {
      benefits,
      total: benefits.length,
      timestamp: new Date().toISOString(),
    };

    console.log(`Successfully retrieved ${benefits.length} member benefits`);

    return createResponse(200, response);
  } catch (error) {
    console.error('Error fetching member benefits:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const errorResponse: ErrorResponse = {
      error: 'Internal Server Error',
      message: errorMessage,
      timestamp: new Date().toISOString(),
    };

    return createResponse(500, errorResponse);
  }
};