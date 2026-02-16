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
      description: 'Access to 24/7 premium customer support with priority response times',
      category: 'Support',
      icon: 'support',
      isActive: true,
      displayOrder: 1,
      eligibilityRequirements: ['Active membership', 'Premium tier'],
    },
    {
      id: '2',
      title: 'Exclusive Discounts',
      description: 'Save up to 20% on all products and services',
      category: 'Savings',
      icon: 'discount',
      isActive: true,
      displayOrder: 2,
      eligibilityRequirements: ['Active membership'],
    },
    {
      id: '3',
      title: 'Early Access',
      description: 'Get early access to new features and products before general release',
      category: 'Access',
      icon: 'early-access',
      isActive: true,
      displayOrder: 3,
      eligibilityRequirements: ['Active membership', 'Premium tier'],
    },
    {
      id: '4',
      title: 'Free Shipping',
      description: 'Enjoy free shipping on all orders with no minimum purchase required',
      category: 'Shipping',
      icon: 'shipping',
      isActive: true,
      displayOrder: 4,
      eligibilityRequirements: ['Active membership'],
    },
    {
      id: '5',
      title: 'Member Events',
      description: 'Exclusive invitations to member-only events and webinars',
      category: 'Events',
      icon: 'events',
      isActive: true,
      displayOrder: 5,
      eligibilityRequirements: ['Active membership'],
    },
  ];

  return mockBenefits;
};

/**
 * Validates query parameters
 * 
 * @param queryParams - Query string parameters from the request
 * @returns Validation result
 */
const validateQueryParameters = (queryParams: Record<string, string | undefined>): { valid: boolean; error?: string } => {
  if (queryParams.category && typeof queryParams.category !== 'string') {
    return { valid: false, error: 'Invalid category parameter' };
  }
  
  if (queryParams.activeOnly && !['true', 'false'].includes(queryParams.activeOnly)) {
    return { valid: false, error: 'Invalid activeOnly parameter. Must be true or false' };
  }

  return { valid: true };
};

/**
 * Filters benefits based on query parameters
 * 
 * @param benefits - Array of member benefits
 * @param queryParams - Query string parameters
 * @returns Filtered array of benefits
 */
const filterBenefits = (benefits: MemberBenefit[], queryParams: Record<string, string | undefined>): MemberBenefit[] => {
  let filtered = [...benefits];

  if (queryParams.category) {
    filtered = filtered.filter(benefit => 
      benefit.category.toLowerCase() === queryParams.category?.toLowerCase()
    );
  }

  if (queryParams.activeOnly === 'true') {
    filtered = filtered.filter(benefit => benefit.isActive);
  }

  return filtered.sort((a, b) => a.displayOrder - b.displayOrder);
};

/**
 * Lambda handler for retrieving member benefits
 * Implements GET endpoint with error handling and response formatting
 * 
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with member benefits data
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
      return createErrorResponse(405, 'MethodNotAllowed', `Method ${event.httpMethod} is not allowed`);
    }

    // Extract and validate query parameters
    const queryParams = event.queryStringParameters || {};
    const validation = validateQueryParameters(queryParams);
    
    if (!validation.valid) {
      return createErrorResponse(400, 'BadRequest', validation.error || 'Invalid request parameters');
    }

    // Fetch member benefits
    console.log('Fetching member benefits...');
    const benefits = await fetchMemberBenefits();

    // Apply filters
    const filteredBenefits = filterBenefits(benefits, queryParams);

    // Prepare response
    const response: MemberBenefitsResponse = {
      benefits: filteredBenefits,
      totalCount: filteredBenefits.length,
      timestamp: new Date().toISOString(),
    };

    console.log(`Successfully retrieved ${filteredBenefits.length} member benefits`);
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