import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler } from '../../src/handlers/login-page';

/**
 * Mock context for Lambda function testing
 */
const mockContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'test-function',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
  memoryLimitInMB: '128',
  awsRequestId: 'test-request-id',
  logGroupName: '/aws/lambda/test-function',
  logStreamName: '2024/01/01/[$LATEST]test',
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
};

/**
 * Create a mock API Gateway event
 */
const createMockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
  body: null,
  headers: {},
  multiValueHeaders: {},
  httpMethod: 'GET',
  isBase64Encoded: false,
  path: '/login',
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {
    accountId: '123456789012',
    apiId: 'test-api-id',
    authorizer: null,
    protocol: 'HTTP/1.1',
    httpMethod: 'GET',
    identity: {
      accessKey: null,
      accountId: null,
      apiKey: null,
      apiKeyId: null,
      caller: null,
      clientCert: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      principalOrgId: null,
      sourceIp: '127.0.0.1',
      user: null,
      userAgent: 'Mozilla/5.0',
      userArn: null,
    },
    path: '/login',
    stage: 'test',
    requestId: 'test-request-id',
    requestTimeEpoch: Date.now(),
    resourceId: 'test-resource-id',
    resourcePath: '/login',
  },
  resource: '/login',
  ...overrides,
});

describe('Login Page Handler', () => {
  describe('Response Validation', () => {
    it('should return 200 status code for successful GET request', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
    });

    it('should return HTML content type header', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.headers).toBeDefined();
      expect(result.headers?.['Content-Type']).toBe('text/html');
    });

    it('should include CORS headers', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.headers).toBeDefined();
      expect(result.headers?.['Access-Control-Allow-Origin']).toBeDefined();
      expect(result.headers?.['Access-Control-Allow-Methods']).toBeDefined();
    });

    it('should return valid HTML body', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toBeDefined();
      expect(result.body).toContain('<!DOCTYPE html>');
      expect(result.body).toContain('<html');
      expect(result.body).toContain('</html>');
    });

    it('should include login form in response body', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toContain('login');
      expect(result.body).toContain('form');
    });

    it('should include red button in response body', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toContain('button');
      expect(result.body).toMatch(/red|#[Ff]{2}0{4}|rgb\(255,\s*0,\s*0\)/);
    });

    it('should include viewport meta tag for responsive design', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toContain('viewport');
      expect(result.body).toContain('width=device-width');
    });

    it('should include responsive CSS or meta tags', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      const hasResponsiveDesign = 
        result.body.includes('@media') ||
        result.body.includes('responsive') ||
        result.body.includes('width=device-width');

      expect(hasResponsiveDesign).toBe(true);
    });

    it('should include security headers', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.headers).toBeDefined();
      expect(result.headers?.['X-Content-Type-Options']).toBe('nosniff');
      expect(result.headers?.['X-Frame-Options']).toBeDefined();
    });

    it('should not be base64 encoded', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.isBase64Encoded).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should return 405 for non-GET methods', async () => {
      const event = createMockEvent({ httpMethod: 'POST' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(405);
    });

    it('should return error message for unsupported methods', async () => {
      const event = createMockEvent({ httpMethod: 'DELETE' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(405);
      expect(result.body).toContain('Method Not Allowed');
    });

    it('should handle missing headers gracefully', async () => {
      const event = createMockEvent({ headers: {} });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      expect(result.body).toBeDefined();
    });

    it('should handle null request context', async () => {
      const event = createMockEvent();
      event.requestContext = null as any;
      
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBeDefined();
      expect([200, 400, 500]).toContain(result.statusCode);
    });

    it('should return valid JSON error response for errors', async () => {
      const event = createMockEvent({ httpMethod: 'PUT' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBeGreaterThanOrEqual(400);
      
      if (result.headers?.['Content-Type']?.includes('application/json')) {
        expect(() => JSON.parse(result.body)).not.toThrow();
      }
    });

    it('should include error message in response body for client errors', async () => {
      const event = createMockEvent({ httpMethod: 'PATCH' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBeGreaterThanOrEqual(400);
      expect(result.body).toBeTruthy();
      expect(result.body.length).toBeGreaterThan(0);
    });

    it('should handle OPTIONS request for CORS preflight', async () => {
      const event = createMockEvent({ httpMethod: 'OPTIONS' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect([200, 204]).toContain(result.statusCode);
      expect(result.headers?.['Access-Control-Allow-Methods']).toBeDefined();
    });

    it('should maintain consistent response structure on errors', async () => {
      const event = createMockEvent({ httpMethod: 'POST' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result).toHaveProperty('statusCode');
      expect(result).toHaveProperty('headers');
      expect(result).toHaveProperty('body');
    });
  });

  describe('Content Validation', () => {
    it('should include title tag', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toContain('<title>');
      expect(result.body).toContain('</title>');
    });

    it('should include charset meta tag', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toMatch(/charset|UTF-8/i);
    });

    it('should include input fields for credentials', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toContain('input');
      expect(result.body).toMatch(/email|username|password/i);
    });

    it('should have proper HTML structure', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toContain('<head>');
      expect(result.body).toContain('</head>');
      expect(result.body).toContain('<body>');
      expect(result.body).toContain('</body>');
    });

    it('should include member benefits reference', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body.toLowerCase()).toMatch(/member|benefit/);
    });
  });

  describe('Performance and Caching', () => {
    it('should complete within acceptable time limit', async () => {
      const event = createMockEvent();
      const startTime = Date.now();
      
      await handler(event, mockContext);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000);
    });

    it('should include cache control headers', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.headers).toBeDefined();
      expect(result.headers?.['Cache-Control']).toBeDefined();
    });

    it('should return consistent response for multiple calls', async () => {
      const event = createMockEvent();
      
      const result1 = await handler(event, mockContext) as APIGatewayProxyResult;
      const result2 = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result1.statusCode).toBe(result2.statusCode);
      expect(result1.body).toBe(result2.body);
    });
  });
});