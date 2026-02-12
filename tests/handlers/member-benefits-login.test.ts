import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler } from '../../src/handlers/member-benefits-login';

/**
 * Mock context for Lambda function testing
 */
const mockContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'member-benefits-login',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:member-benefits-login',
  memoryLimitInMB: '128',
  awsRequestId: 'test-request-id',
  logGroupName: '/aws/lambda/member-benefits-login',
  logStreamName: '2024/01/01/[$LATEST]test',
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
};

/**
 * Helper function to create mock API Gateway event
 */
const createMockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
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
  describe('GET /member-benefits/login', () => {
    it('should return 200 status code for successful request', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
    });

    it('should return proper content-type header', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.headers).toBeDefined();
      expect(result.headers?.['Content-Type']).toBe('text/html');
    });

    it('should return CORS headers', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.headers).toBeDefined();
      expect(result.headers?.['Access-Control-Allow-Origin']).toBeDefined();
      expect(result.headers?.['Access-Control-Allow-Methods']).toBeDefined();
    });

    it('should return HTML body with login form', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toBeDefined();
      expect(result.body).toContain('<!DOCTYPE html>');
      expect(result.body).toContain('<form');
      expect(result.body).toContain('login');
    });

    it('should include red button in response', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toContain('button');
      expect(result.body).toMatch(/background.*red|bg-red|color.*red/i);
    });

    it('should include responsive meta tags', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toContain('viewport');
      expect(result.body).toContain('width=device-width');
    });

    it('should include email input field', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toContain('email');
      expect(result.body).toContain('type="email"');
    });

    it('should include password input field', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toContain('password');
      expect(result.body).toContain('type="password"');
    });
  });

  describe('POST /member-benefits/login', () => {
    it('should handle POST requests', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBeDefined();
      expect([200, 201, 302, 400, 401]).toContain(result.statusCode);
    });

    it('should validate email format', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ email: 'invalid-email', password: 'password123' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect([400, 422]).toContain(result.statusCode);
    });

    it('should require password field', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect([400, 422]).toContain(result.statusCode);
    });

    it('should handle missing request body', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        body: null,
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect([400, 422]).toContain(result.statusCode);
    });

    it('should handle malformed JSON', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        body: 'invalid-json{',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect([400, 422]).toContain(result.statusCode);
    });
  });

  describe('Error Handling', () => {
    it('should return 405 for unsupported HTTP methods', async () => {
      const event = createMockEvent({ httpMethod: 'DELETE' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(405);
    });

    it('should handle OPTIONS requests for CORS preflight', async () => {
      const event = createMockEvent({ httpMethod: 'OPTIONS' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Access-Control-Allow-Methods']).toBeDefined();
    });

    it('should return proper error response structure', async () => {
      const event = createMockEvent({ httpMethod: 'DELETE' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result).toHaveProperty('statusCode');
      expect(result).toHaveProperty('headers');
      expect(result).toHaveProperty('body');
    });

    it('should handle internal server errors gracefully', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBeLessThan(600);
      expect(result.statusCode).toBeGreaterThanOrEqual(200);
    });

    it('should include error message in response body for errors', async () => {
      const event = createMockEvent({ httpMethod: 'DELETE' });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      if (result.statusCode >= 400) {
        expect(result.body).toBeDefined();
        const body = JSON.parse(result.body);
        expect(body).toHaveProperty('message');
      }
    });
  });

  describe('Security', () => {
    it('should include security headers', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.headers).toBeDefined();
      expect(result.headers?.['X-Content-Type-Options']).toBe('nosniff');
    });

    it('should not expose sensitive information in error messages', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'wrong' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      if (result.statusCode === 401) {
        expect(result.body).not.toContain('database');
        expect(result.body).not.toContain('stack trace');
      }
    });

    it('should sanitize user input', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ 
          email: '<script>alert("xss")</script>@example.com', 
          password: 'password123' 
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect([400, 422]).toContain(result.statusCode);
    });
  });

  describe('Response Validation', () => {
    it('should return valid APIGatewayProxyResult structure', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result).toHaveProperty('statusCode');
      expect(result).toHaveProperty('headers');
      expect(result).toHaveProperty('body');
      expect(typeof result.statusCode).toBe('number');
      expect(typeof result.body).toBe('string');
    });

    it('should return valid HTML for GET requests', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toMatch(/<!DOCTYPE html>/i);
      expect(result.body).toContain('<html');
      expect(result.body).toContain('</html>');
    });

    it('should return valid JSON for POST requests', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      if (result.headers?.['Content-Type']?.includes('application/json')) {
        expect(() => JSON.parse(result.body)).not.toThrow();
      }
    });
  });

  describe('Responsive Design', () => {
    it('should include CSS for responsive design', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toMatch(/@media|flex|grid/i);
    });

    it('should include mobile-friendly viewport settings', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.body).toContain('viewport');
      expect(result.body).toContain('initial-scale=1');
    });
  });
});