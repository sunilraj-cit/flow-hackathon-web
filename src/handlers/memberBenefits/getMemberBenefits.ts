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
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Content-Type': 'application/json',
};

/**
 * Mock data for member benefits
 * In production, this would be fetched from DynamoDB or another data source
 */
const MOCK_BENEFITS: MemberBenefit[] = [
  {
    id: '1',
    title: 'Premium Support',
    description: 'Access to 24/7 premium customer support with priority response times',
    category: 'Support',
    icon: 'headset',
    isActive: true,
    displayOrder: 1,
    eligibilityRequirements: ['Active membership', 'Premium tier'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Exclusive Content',
    description: 'Access to members-only content, webinars, and educational resources',
    category: 'Content',
    icon: 'book',
    isActive: true,
    displayOrder: 2,
    eligibilityRequirements: ['Active membership'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Discount Programs',
    description: 'Special discounts on products and services from partner organizations',
    category: 'Savings',
    icon: 'tag',
    isActive: true,
    displayOrder: 3,
    eligibilityRequirements: ['Active membership'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'Networking Events',
    description: 'Invitations to exclusive networking events and conferences',
    category: 'Events',
    icon: 'users',
    isActive: true,
    displayOrder: 4,
    eligibilityRequirements: ['Active membership', 'Verified profile'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    title: 'Early Access',
    description: 'Get early access to new features and product launches',
    category: 'Features',
    icon: 'zap',
    isActive: true,
    displayOrder: 5,
    eligibilityRequirements: ['Active membership', 'Premium tier'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Creates a standardized API Gateway response
 * 
 * @param statusCode - HTTP status code
 * @param body - Response body object
 * @returns Formatted API Gateway response
 */
const createResponse = (statusCode: number, body: MemberBenefitsResponse): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
};

/**
 * Validates query parameters for filtering and pagination
 * 
 * @param queryParams - Query string parameters from the request
 * @returns Validated and parsed query parameters
 */
const parseQueryParameters = (queryParams: { [key: string]: string | undefined } | null) => {
  const category = queryParams?.category;
  const isActive = queryParams?.isActive === 'true' ? true : queryParams?.isActive === 'false' ? false : undefined;
  const limit = queryParams?.limit ? parseInt(queryParams.limit, 10) : undefined;
  const offset = queryParams?.offset ? parseInt(queryParams.offset, 10) : 0;

  return {
    category,
    isActive,
    limit: limit && !isNaN(limit) ? limit : undefined,
    offset: offset && !isNaN(offset) ? offset : 0,
  };
};

/**
 * Filters member benefits based on query parameters
 * 
 * @param benefits - Array of member benefits
 * @param filters - Filter criteria
 * @returns Filtered array of member benefits
 */
const filterBenefits = (
  benefits: MemberBenefit[],
  filters: { category?: string; isActive?: boolean }
): MemberBenefit[] => {
  let filtered = [...benefits];

  if (filters.category) {
    filtered = filtered.filter(
      (benefit) => benefit.category.toLowerCase() === filters.category?.toLowerCase()
    );
  }

  if (filters.isActive !== undefined) {
    filtered = filtered.filter((benefit) => benefit.isActive === filters.isActive);
  }

  return filtered.sort((a, b) => a.displayOrder - b.displayOrder);
};

/**
 * Applies pagination to the benefits array
 * 
 * @param benefits - Array of member benefits
 * @param offset - Starting index
 * @param limit - Maximum number of items to return
 * @returns Paginated array of member benefits
 */
const paginateBenefits = (
  benefits: MemberBenefit[],
  offset: number,
  limit?: number
): MemberBenefit[] => {
  if (limit) {
    return benefits.slice(offset, offset + limit);
  }
  return benefits.slice(offset);
};

/**
 * Fetches member benefits from the data source
 * In production, this would query DynamoDB or another database
 * 
 * @returns Promise resolving to array of member benefits
 */
const fetchMemberBenefits = async (): Promise<MemberBenefit[]> => {
  // TODO: Replace with actual database query
  // Example DynamoDB query:
  // const params = {
  //   TableName: process.env.BENEFITS_TABLE_NAME || 'MemberBenefits',
  // };
  // const result = await dynamoDb.scan(params).promise();
  // return result.Items as MemberBenefit[];

  return Promise.resolve(MOCK_BENEFITS);
};

/**
 * Lambda handler for retrieving member benefits
 * Supports filtering by category and active status, with pagination
 * 
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result with member benefits data
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
        error: 'Method Not Allowed',
        message: 'Only GET requests are supported',
      });
    }

    // Parse and validate query parameters
    const { category, isActive, limit, offset } = parseQueryParameters(event.queryStringParameters);

    console.log('Query parameters:', { category, isActive, limit, offset });

    // Fetch member benefits
    const benefits = await fetchMemberBenefits();

    // Apply filters
    const filteredBenefits = filterBenefits(benefits, { category, isActive });

    // Apply pagination
    const paginatedBenefits = paginateBenefits(filteredBenefits, offset, limit);

    console.log(`Returning ${paginatedBenefits.length} of ${filteredBenefits.length} total benefits`);

    // Return successful response
    return createResponse(200, {
      success: true,
      data: paginatedBenefits,
      message: `Successfully retrieved ${paginatedBenefits.length} member benefits`,
    });
  } catch (error) {
    console.error('Error retrieving member benefits:', error);

    // Handle specific error types
    if (error instanceof Error) {
      return createResponse(500, {
        success: false,
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while retrieving member benefits',
      });
    }

    // Handle unknown errors
    return createResponse(500, {
      success: false,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};