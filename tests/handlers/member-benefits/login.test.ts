import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler } from '../../../src/handlers/member-benefits/login';

/**
 * Mock context for Lambda function testing
 */
const createMockContext = (): Context => ({
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'test-function',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
  memoryLimitInMB: '128',
  awsRequestId: 'test-request-id',
  logGroupName: '/aws/lambda/test-function',
  logStreamName: '2024/01/01/[$LATEST]test-stream',
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
});

/**
 * Create mock API Gateway event
 */
const createMockEvent = (overrides?: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent => ({
  body: null,
  headers: {},
  multiValueHeaders: {},
  httpMethod: 'GET',
  isBase64Encoded: false,
  path: '/member-benefits/login',
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
    path: '/member-benefits/login',
    stage: 'test',
    requestId: 'test-request-id',
    requestTimeEpoch: Date.now(),
    resourceId: 'test-resource-id',
    resourcePath: '/member-benefits/login',
  },
  resource: '/member-benefits/login',
  ...overrides,
});

describe('Member Benefits Login Handler', () => {
  let mockContext: Context;

  beforeEach(() => {
    mockContext = createMockContext();
  });

  describe('GET /member-benefits/login', () => {
    it('should return 200 status code for valid GET request', async () => {
      const event = createMockEvent({ httpMethod: 'GET' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
    });

    it('should return HTML content type header', async () => {
      const event = createMockEvent({ httpMethod: 'GET' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.headers).toBeDefined();
      expect(result.headers?.['Content-Type']).toBe('text/html');
    });

    it('should return CORS headers', async () => {
      const event = createMockEvent({ httpMethod: 'GET' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.headers).toBeDefined();
      expect(result.headers?.['Access-Control-Allow-Origin']).toBeDefined();
      expect(result.headers?.['Access-Control-Allow-Methods']).toBeDefined();
    });

    it('should return HTML body with login form', async () => {
      const event = createMockEvent({ httpMethod: 'GET' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toBeDefined();
      expect(result.body).toContain('<!DOCTYPE html>');
      expect(result.body).toContain('<form');
      expect(result.body).toContain('login');
    });

    it('should include red button in response', async () => {
      const event = createMockEvent({ httpMethod: 'GET' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toContain('button');
      expect(result.body).toMatch(/red|#[Ff]{2}0{4}|rgb\(255,\s*0,\s*0\)/);
    });

    it('should include responsive meta viewport tag', async () => {
      const event = createMockEvent({ httpMethod: 'GET' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toContain('viewport');
      expect(result.body).toContain('width=device-width');
    });

    it('should include responsive CSS or media queries', async () => {
      const event = createMockEvent({ httpMethod: 'GET' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      const hasMediaQueries = result.body.includes('@media') || result.body.includes('responsive');
      const hasFlexbox = result.body.includes('flex') || result.body.includes('grid');
      
      expect(hasMediaQueries || hasFlexbox).toBe(true);
    });
  });

  describe('POST /member-benefits/login', () => {
    it('should handle POST request with credentials', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        body: JSON.stringify({
          username: 'testuser',
          password: 'testpassword',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBeDefined();
      expect([200, 302, 400, 401]).toContain(result.statusCode);
    });

    it('should return 400 for missing credentials', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect([400, 401]).toContain(result.statusCode);
    });

    it('should return 400 for invalid JSON body', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
    });

    it('should return JSON content type for POST response', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        body: JSON.stringify({
          username: 'testuser',
          password: 'testpassword',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.headers).toBeDefined();
      expect(
        result.headers?.['Content-Type'] === 'application/json' ||
        result.headers?.['Content-Type'] === 'text/html'
      ).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 405 for unsupported HTTP methods', async () => {
      const event = createMockEvent({ httpMethod: 'DELETE' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(405);
    });

    it('should handle missing event gracefully', async () => {
      const result = await handler(null as any, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(500);
      expect(result.body).toBeDefined();
    });

    it('should handle missing context gracefully', async () => {
      const event = createMockEvent({ httpMethod: 'GET' });
      const result = await handler(event, null as any) as APIGatewayProxyResult;

      expect(result.statusCode).toBeDefined();
    });

    it('should return proper error structure', async () => {
      const event = createMockEvent({ httpMethod: 'DELETE' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result).toHaveProperty('statusCode');
      expect(result).toHaveProperty('headers');
      expect(result).toHaveProperty('body');
    });

    it('should include error message in response body', async () => {
      const event = createMockEvent({ httpMethod: 'DELETE' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toBeDefined();
      const body = typeof result.body === 'string' ? result.body : JSON.stringify(result.body);
      expect(body.length).toBeGreaterThan(0);
    });
  });

  describe('Response Validation', () => {
    it('should return valid APIGatewayProxyResult structure', async () => {
      const event = createMockEvent({ httpMethod: 'GET' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result).toHaveProperty('statusCode');
      expect(result).toHaveProperty('headers');
      expect(result).toHaveProperty('body');
      expect(typeof result.statusCode).toBe('number');
      expect(typeof result.body).toBe('string');
    });

    it('should have valid status code range', async () => {
      const event = createMockEvent({ httpMethod: 'GET' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBeGreaterThanOrEqual(200);
      expect(result.statusCode).toBeLessThan(600);
    });

    it('should return non-empty body', async () => {
      const event = createMockEvent({ httpMethod: 'GET' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toBeDefined();
      expect(result.body.length).toBeGreaterThan(0);
    });

    it('should include security headers', async () => {
      const event = createMockEvent({ httpMethod: 'GET' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.headers).toBeDefined();
      const hasSecurityHeaders = 
        result.headers?.['X-Content-Type-Options'] ||
        result.headers?.['X-Frame-Options'] ||
        result.headers?.['Content-Security-Policy'];
      
      expect(hasSecurityHeaders).toBeDefined();
    });
  });

  describe('Integration with Member Benefits', () => {
    it('should be accessible at correct path', async () => {
      const event = createMockEvent({ 
        httpMethod: 'GET',
        path: '/member-benefits/login',
      });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
    });

    it('should include member benefits branding or reference', async () => {
      const event = createMockEvent({ httpMethod: 'GET' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      const bodyLower = result.body.toLowerCase();
      expect(
        bodyLower.includes('member') || 
        bodyLower.includes('benefit')
      ).toBe(true);
    });
  });
});
```