/**
 * Standardized API Response Utilities
 * 
 * Provides consistent response formatting for API endpoints across the application.
 * Includes helpers for success, error, and validation responses with proper HTTP status codes.
 */

/**
 * Standard API response structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Creates a successful API response
 * 
 * @param data - The response data
 * @param meta - Optional metadata (pagination, requestId, etc.)
 * @returns Standardized success response
 * 
 * @example
 * ```typescript
 * return success({ benefits: [...] });
 * ```
 */
export function success<T>(
  data: T,
  meta?: Omit<ApiResponse['meta'], 'timestamp'>
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * Creates a paginated success response
 * 
 * @param data - The response data array
 * @param pagination - Pagination information
 * @param meta - Optional additional metadata
 * @returns Standardized paginated success response
 * 
 * @example
 * ```typescript
 * return successWithPagination(items, { page: 1, pageSize: 10, total: 100 });
 * ```
 */
export function successWithPagination<T>(
  data: T,
  pagination: PaginationParams,
  meta?: Omit<ApiResponse['meta'], 'timestamp' | 'pagination'>
): ApiResponse<T> {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);

  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        totalPages,
      },
      ...meta,
    },
  };
}

/**
 * Creates an error API response
 * 
 * @param message - Error message
 * @param code - Optional error code
 * @param details - Optional additional error details
 * @returns Standardized error response
 * 
 * @example
 * ```typescript
 * return error('Resource not found', 'NOT_FOUND');
 * ```
 */
export function error(
  message: string,
  code?: string,
  details?: any
): ApiResponse<never> {
  return {
    success: false,
    error: {
      message,
      code,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Creates a validation error response
 * 
 * @param errors - Validation error details
 * @param message - Optional custom message
 * @returns Standardized validation error response
 * 
 * @example
 * ```typescript
 * return validationError({ email: 'Invalid email format' });
 * ```
 */
export function validationError(
  errors: Record<string, string | string[]>,
  message: string = 'Validation failed'
): ApiResponse<never> {
  return {
    success: false,
    error: {
      message,
      code: 'VALIDATION_ERROR',
      details: errors,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Creates a not found error response
 * 
 * @param resource - The resource that was not found
 * @returns Standardized not found error response
 * 
 * @example
 * ```typescript
 * return notFound('Member benefit');
 * ```
 */
export function notFound(resource: string = 'Resource'): ApiResponse<never> {
  return error(`${resource} not found`, 'NOT_FOUND');
}

/**
 * Creates an unauthorized error response
 * 
 * @param message - Optional custom message
 * @returns Standardized unauthorized error response
 * 
 * @example
 * ```typescript
 * return unauthorized('Invalid credentials');
 * ```
 */
export function unauthorized(
  message: string = 'Unauthorized access'
): ApiResponse<never> {
  return error(message, 'UNAUTHORIZED');
}

/**
 * Creates a forbidden error response
 * 
 * @param message - Optional custom message
 * @returns Standardized forbidden error response
 * 
 * @example
 * ```typescript
 * return forbidden('Insufficient permissions');
 * ```
 */
export function forbidden(
  message: string = 'Access forbidden'
): ApiResponse<never> {
  return error(message, 'FORBIDDEN');
}

/**
 * Creates a bad request error response
 * 
 * @param message - Error message
 * @param details - Optional error details
 * @returns Standardized bad request error response
 * 
 * @example
 * ```typescript
 * return badRequest('Invalid request parameters');
 * ```
 */
export function badRequest(
  message: string = 'Bad request',
  details?: any
): ApiResponse<never> {
  return error(message, 'BAD_REQUEST', details);
}

/**
 * Creates an internal server error response
 * 
 * @param message - Optional custom message
 * @param details - Optional error details (should not expose sensitive info in production)
 * @returns Standardized internal server error response
 * 
 * @example
 * ```typescript
 * return internalServerError('An unexpected error occurred');
 * ```
 */
export function internalServerError(
  message: string = 'Internal server error',
  details?: any
): ApiResponse<never> {
  return error(
    message,
    'INTERNAL_SERVER_ERROR',
    process.env.NODE_ENV === 'development' ? details : undefined
  );
}

/**
 * Creates a conflict error response
 * 
 * @param message - Error message
 * @param details - Optional error details
 * @returns Standardized conflict error response
 * 
 * @example
 * ```typescript
 * return conflict('Resource already exists');
 * ```
 */
export function conflict(
  message: string = 'Resource conflict',
  details?: any
): ApiResponse<never> {
  return error(message, 'CONFLICT', details);
}

/**
 * Creates a no content success response
 * 
 * @returns Standardized no content response
 * 
 * @example
 * ```typescript
 * return noContent();
 * ```
 */
export function noContent(): ApiResponse<null> {
  return {
    success: true,
    data: null,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * HTTP status codes for API responses
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Maps error codes to HTTP status codes
 * 
 * @param code - Error code
 * @returns Corresponding HTTP status code
 */
export function getHttpStatusFromErrorCode(code?: string): number {
  const statusMap: Record<string, number> = {
    VALIDATION_ERROR: HttpStatus.UNPROCESSABLE_ENTITY,
    NOT_FOUND: HttpStatus.NOT_FOUND,
    UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
    FORBIDDEN: HttpStatus.FORBIDDEN,
    BAD_REQUEST: HttpStatus.BAD_REQUEST,
    CONFLICT: HttpStatus.CONFLICT,
    INTERNAL_SERVER_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
  };

  return statusMap[code || ''] || HttpStatus.INTERNAL_SERVER_ERROR;
}

/**
 * Creates a Response object with proper headers and status code
 * 
 * @param response - API response object
 * @param statusCode - Optional HTTP status code (auto-determined if not provided)
 * @returns Response object ready to be returned from API routes
 * 
 * @example
 * ```typescript
 * return createResponse(success({ data: benefits }));
 * ```
 */
export function createResponse(
  response: ApiResponse,
  statusCode?: number
): Response {
  const status =
    statusCode ||
    (response.success
      ? HttpStatus.OK
      : getHttpStatusFromErrorCode(response.error?.code));

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, must-revalidate',
    },
  });
}