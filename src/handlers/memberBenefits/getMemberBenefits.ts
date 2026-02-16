import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Member benefit interface
 */
interface MemberBenefit {
  id: string;
  title: string;
  description: string;
  category: string;
  icon?: string;
  isActive: boolean;
  eligibilityTier?: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response structure for member benefits
 */
interface MemberBenefitsResponse {
  success: boolean;
  data?: MemberBenefit[];
  message?: string;
  error?: string;
}

/**
 * CORS headers for API responses
 */
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Creates a standardized API Gateway response
 * 
 * @param statusCode - HTTP status code
 * @param body - Response body object
 * @returns Formatted API Gateway response
 */
const createResponse = (
  statusCode: number,
  body: MemberBenefitsResponse
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
};

/**
 * Fetches member benefits data
 * In production, this would query a database or external service
 * 
 * @returns Array of member benefits
 */
const fetchMemberBenefits = async (): Promise<MemberBenefit[]> => {
  // TODO: Replace with actual database query (DynamoDB, RDS, etc.)
  // This is mock data for initial implementation
  const mockBenefits: MemberBenefit[] = [
    {
      id: '1',
      title: 'Premium Support',
      description: 'Access to 24/7 priority customer support with dedicated account managers',
      category: 'Support',
      icon: 'support',
      isActive: true,
      eligibilityTier: 'Premium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Exclusive Discounts',
      description: 'Up to 20% off on all products and services',
      category: 'Savings',
      icon: 'discount',
      isActive: true,
      eligibilityTier: 'Standard',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '3',
      title: 'Early Access',
      description: 'Be the first to access new features and product launches',
      category: 'Access',
      icon: 'early-access',
      isActive: true,
      eligibilityTier: 'Premium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '4',
      title: 'Free Shipping',
      description: 'Complimentary shipping on all orders, no minimum purchase required',
      category: 'Savings',
      icon: 'shipping',
      isActive: true,
      eligibilityTier: 'Standard',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '5',
      title: 'Member Events',
      description: 'Invitations to exclusive member-only events and webinars',
      category: 'Events',
      icon: 'events',
      isActive: true,
      eligibilityTier: 'Premium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return mockBenefits;
};

/**
 * Validates query parameters from the request
 * 
 * @param event - API Gateway event
 * @returns Validation result
 */
const validateQueryParameters = (event: APIGatewayProxyEvent): { valid: boolean; error?: string } => {
  const queryParams = event.queryStringParameters;

  if (queryParams?.category) {
    const validCategories = ['Support', 'Savings', 'Access', 'Events'];
    if (!validCategories.includes(queryParams.category)) {
      return {
        valid: false,
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
      };
    }
  }

  if (queryParams?.tier) {
    const validTiers = ['Standard', 'Premium'];
    if (!validTiers.includes(queryParams.tier)) {
      return {
        valid: false,
        error: `Invalid tier. Must be one of: ${validTiers.join(', ')}`,
      };
    }
  }

  return { valid: true };
};

/**
 * Filters benefits based on query parameters
 * 
 * @param benefits - Array of member benefits
 * @param queryParams - Query parameters from request
 * @returns Filtered array of benefits
 */
const filterBenefits = (
  benefits: MemberBenefit[],
  queryParams: Record<string, string> | null
): MemberBenefit[] => {
  if (!queryParams) {
    return benefits;
  }

  let filtered = benefits;

  if (queryParams.category) {
    filtered = filtered.filter((benefit) => benefit.category === queryParams.category);
  }

  if (queryParams.tier) {
    filtered = filtered.filter((benefit) => benefit.eligibilityTier === queryParams.tier);
  }

  if (queryParams.active !== undefined) {
    const isActive = queryParams.active === 'true';
    filtered = filtered.filter((benefit) => benefit.isActive === isActive);
  }

  return filtered;
};

/**
 * Lambda handler for GET /member-benefits endpoint
 * Retrieves and returns member benefits data with optional filtering
 * 
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with member benefits data
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    // Handle OPTIONS request for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, { success: true });
    }

    // Validate HTTP method
    if (event.httpMethod !== 'GET') {
      return createResponse(405, {
        success: false,
        error: 'Method not allowed. Only GET requests are supported.',
      });
    }

    // Validate query parameters
    const validation = validateQueryParameters(event);
    if (!validation.valid) {
      return createResponse(400, {
        success: false,
        error: validation.error,
      });
    }

    // Fetch member benefits
    console.log('Fetching member benefits...');
    const benefits = await fetchMemberBenefits();

    // Apply filters if query parameters are provided
    const filteredBenefits = filterBenefits(benefits, event.queryStringParameters);

    console.log(`Successfully retrieved ${filteredBenefits.length} member benefits`);

    return createResponse(200, {
      success: true,
      data: filteredBenefits,
      message: `Successfully retrieved ${filteredBenefits.length} member benefit(s)`,
    });
  } catch (error) {
    console.error('Error fetching member benefits:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return createResponse(500, {
      success: false,
      error: 'Internal server error',
      message: errorMessage,
    });
  }
};