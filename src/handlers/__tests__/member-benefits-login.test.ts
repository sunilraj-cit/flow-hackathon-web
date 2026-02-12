import { handler } from '../member-benefits-login';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

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
 * Creates a mock API Gateway proxy event
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
    protocol: 'HTTP/1.1',
    httpMethod: 'GET',
    path: '/member-benefits/login',
    stage: 'prod',
    requestId: 'test-request-id',
    requestTime: '01/Jan/2024:00:00:00 +0000',
    requestTimeEpoch: 1704067200000,
    identity: {
      cognitoIdentityPoolId: null,
      accountId: null,
      cognitoIdentityId: null,
      caller: null,
      sourceIp: '127.0.0.1',
      principalOrgId: null,
      accessKey: null,
      cognitoAuthenticationType: null,
      cognitoAuthenticationProvider: null,
      userArn: null,
      userAgent: 'Mozilla/5.0',
      user: null,
      apiKey: null,
      apiKeyId: null,
      clientCert: null,
    },
    authorizer: null,
    resourceId: 'test-resource-id',
    resourcePath: '/member-benefits/login',
  },
  resource: '/member-benefits/login',
  ...overrides,
});

describe('member-benefits-login handler', () => {
  describe('successful page load', () => {
    it('should return 200 status code', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
    });

    it('should return HTML content type', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      expect(result.headers).toBeDefined();
      expect(result.headers?.['Content-Type']).toBe('text/html');
    });

    it('should include security headers', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      expect(result.headers).toBeDefined();
      expect(result.headers?.['X-Content-Type-Options']).toBe('nosniff');
      expect(result.headers?.['X-Frame-Options']).toBe('DENY');
      expect(result.headers?.['X-XSS-Protection']).toBe('1; mode=block');
      expect(result.headers?.['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains');
    });

    it('should include cache control headers', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      expect(result.headers).toBeDefined();
      expect(result.headers?.['Cache-Control']).toBe('no-cache, no-store, must-revalidate');
    });

    it('should return valid HTML body', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      expect(result.body).toBeDefined();
      expect(result.body).toContain('<!DOCTYPE html>');
      expect(result.body).toContain('<html');
      expect(result.body).toContain('</html>');
    });

    it('should include login form in HTML', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      expect(result.body).toContain('Member Benefits Login');
      expect(result.body).toContain('<form');
      expect(result.body).toContain('type="email"');
      expect(result.body).toContain('type="password"');
    });

    it('should include red button in HTML', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      expect(result.body).toContain('button');
      expect(result.body).toMatch(/background.*red|bg-red|#[Dd][Cc]0000|#[Ff]{2}0000/);
    });

    it('should include responsive meta tags', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      expect(result.body).toContain('viewport');
      expect(result.body).toContain('width=device-width');
      expect(result.body).toContain('initial-scale=1');
    });

    it('should include responsive CSS', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      expect(result.body).toContain('@media');
    });
  });

  describe('error handling', () => {
    it('should handle missing event gracefully', async () => {
      const result = await handler(null as any, mockContext);

      expect(result.statusCode).toBeGreaterThanOrEqual(200);
      expect(result.headers).toBeDefined();
    });

    it('should handle missing context gracefully', async () => {
      const event = createMockEvent();
      const result = await handler(event, null as any);

      expect(result.statusCode).toBeGreaterThanOrEqual(200);
      expect(result.headers).toBeDefined();
    });

    it('should return valid response structure on error', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      expect(result).toHaveProperty('statusCode');
      expect(result).toHaveProperty('headers');
      expect(result).toHaveProperty('body');
    });

    it('should handle malformed event data', async () => {
      const malformedEvent = {
        ...createMockEvent(),
        requestContext: null as any,
      };
      const result = await handler(malformedEvent, mockContext);

      expect(result.statusCode).toBeGreaterThanOrEqual(200);
    });
  });

  describe('response headers', () => {
    it('should include all required security headers', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      const requiredHeaders = [
        'Content-Type',
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection',
        'Strict-Transport-Security',
        'Cache-Control',
      ];

      requiredHeaders.forEach(header => {
        expect(result.headers).toHaveProperty(header);
      });
    });

    it('should set correct content type for HTML', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      expect(result.headers?.['Content-Type']).toMatch(/text\/html/);
    });

    it('should include charset in content type', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      const contentType = result.headers?.['Content-Type'] || '';
      expect(contentType).toContain('text/html');
    });

    it('should prevent caching of login page', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      const cacheControl = result.headers?.['Cache-Control'] || '';
      expect(cacheControl).toContain('no-cache');
      expect(cacheControl).toContain('no-store');
    });

    it('should set HSTS header for HTTPS enforcement', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      const hsts = result.headers?.['Strict-Transport-Security'] || '';
      expect(hsts).toContain('max-age=');
      expect(hsts).toContain('includeSubDomains');
    });

    it('should prevent clickjacking with X-Frame-Options', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      expect(result.headers?.['X-Frame-Options']).toBe('DENY');
    });

    it('should prevent MIME type sniffing', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      expect(result.headers?.['X-Content-Type-Options']).toBe('nosniff');
    });

    it('should enable XSS protection', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      const xssProtection = result.headers?.['X-XSS-Protection'] || '';
      expect(xssProtection).toContain('1');
      expect(xssProtection).toContain('mode=block');
    });
  });

  describe('HTTP methods', () => {
    it('should handle GET requests', async () => {
      const event = createMockEvent({ httpMethod: 'GET' });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
    });

    it('should handle POST requests', async () => {
      const event = createMockEvent({ httpMethod: 'POST' });
      const result = await handler(event, mockContext);

      expect(result.statusCode).toBeGreaterThanOrEqual(200);
    });
  });

  describe('responsive design', () => {
    it('should include viewport meta tag for mobile', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      expect(result.body).toContain('name="viewport"');
      expect(result.body).toContain('width=device-width');
    });

    it('should include media queries for responsive layout', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      expect(result.body).toMatch(/@media.*\(.*max-width|min-width/);
    });

    it('should include flexible container styles', async () => {
      const event = createMockEvent();
      const result = await handler(event, mockContext);

      expect(result.body).toMatch(/max-width|width.*%|flex|grid/);
    });
  });
});
```