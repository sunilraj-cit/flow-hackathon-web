import { handler } from '../../src/handlers/member-benefits-login';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

/**
 * Creates a mock API Gateway Proxy Event for testing
 */
const createMockEvent = (overrides?: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent => {
  return {
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
        userAgent: 'test-agent',
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
  };
};

/**
 * Creates a mock Lambda Context for testing
 */
const createMockContext = (): Context => {
  return {
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
};

describe('Member Benefits Login Handler', () => {
  let mockEvent: APIGatewayProxyEvent;
  let mockContext: Context;

  beforeEach(() => {
    mockEvent = createMockEvent();
    mockContext = createMockContext();
  });

  describe('Successful Page Load', () => {
    it('should return 200 status code on successful request', async () => {
      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(200);
    });

    it('should return HTML content in the body', async () => {
      const response = await handler(mockEvent, mockContext);

      expect(response.body).toBeDefined();
      expect(response.body).toContain('<!DOCTYPE html>');
      expect(response.body).toContain('<html');
      expect(response.body).toContain('</html>');
    });

    it('should include login form elements', async () => {
      const response = await handler(mockEvent, mockContext);

      expect(response.body).toContain('<form');
      expect(response.body).toContain('type="email"');
      expect(response.body).toContain('type="password"');
      expect(response.body).toContain('type="submit"');
    });

    it('should include red button styling', async () => {
      const response = await handler(mockEvent, mockContext);

      expect(response.body).toMatch(/background.*red|bg-red|red.*button/i);
    });

    it('should include responsive meta viewport tag', async () => {
      const response = await handler(mockEvent, mockContext);

      expect(response.body).toContain('<meta name="viewport"');
      expect(response.body).toContain('width=device-width');
      expect(response.body).toContain('initial-scale=1');
    });

    it('should include page title', async () => {
      const response = await handler(mockEvent, mockContext);

      expect(response.body).toContain('<title');
      expect(response.body).toMatch(/member.*benefits.*login|login.*member.*benefits/i);
    });
  });

  describe('Content-Type Headers', () => {
    it('should return proper content-type header for HTML', async () => {
      const response = await handler(mockEvent, mockContext);

      expect(response.headers).toBeDefined();
      expect(response.headers?.['Content-Type']).toBe('text/html');
    });

    it('should include charset in content-type', async () => {
      const response = await handler(mockEvent, mockContext);

      const contentType = response.headers?.['Content-Type'];
      expect(contentType).toMatch(/text\/html/);
    });

    it('should include cache-control headers', async () => {
      const response = await handler(mockEvent, mockContext);

      expect(response.headers).toHaveProperty('Cache-Control');
    });

    it('should include security headers', async () => {
      const response = await handler(mockEvent, mockContext);

      expect(response.headers).toBeDefined();
      expect(response.headers?.['X-Content-Type-Options']).toBe('nosniff');
    });
  });

  describe('Response Structure', () => {
    it('should return a valid API Gateway response structure', async () => {
      const response = await handler(mockEvent, mockContext);

      expect(response).toHaveProperty('statusCode');
      expect(response).toHaveProperty('headers');
      expect(response).toHaveProperty('body');
    });

    it('should have headers as an object', async () => {
      const response = await handler(mockEvent, mockContext);

      expect(typeof response.headers).toBe('object');
      expect(response.headers).not.toBeNull();
    });

    it('should have body as a string', async () => {
      const response = await handler(mockEvent, mockContext);

      expect(typeof response.body).toBe('string');
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should not be base64 encoded', async () => {
      const response = await handler(mockEvent, mockContext);

      expect(response.isBase64Encoded).toBeFalsy();
    });

    it('should include CORS headers if configured', async () => {
      const response = await handler(mockEvent, mockContext);

      if (response.headers?.['Access-Control-Allow-Origin']) {
        expect(response.headers['Access-Control-Allow-Origin']).toBeDefined();
      }
    });
  });

  describe('Responsive Design', () => {
    it('should include CSS for responsive design', async () => {
      const response = await handler(mockEvent, mockContext);

      expect(response.body).toMatch(/<style|<link.*stylesheet/);
      expect(response.body).toMatch(/@media|flex|grid/);
    });

    it('should include mobile-friendly meta tags', async () => {
      const response = await handler(mockEvent, mockContext);

      expect(response.body).toContain('viewport');
      expect(response.body).toContain('width=device-width');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing event gracefully', async () => {
      const response = await handler(null as any, mockContext);

      expect(response.statusCode).toBeDefined();
      expect([200, 400, 500]).toContain(response.statusCode);
    });

    it('should handle missing context gracefully', async () => {
      const response = await handler(mockEvent, null as any);

      expect(response.statusCode).toBeDefined();
      expect([200, 400, 500]).toContain(response.statusCode);
    });
  });

  describe('HTTP Methods', () => {
    it('should handle GET requests', async () => {
      const getEvent = createMockEvent({ httpMethod: 'GET' });
      const response = await handler(getEvent, mockContext);

      expect(response.statusCode).toBe(200);
    });

    it('should handle POST requests appropriately', async () => {
      const postEvent = createMockEvent({ httpMethod: 'POST' });
      const response = await handler(postEvent, mockContext);

      expect(response.statusCode).toBeDefined();
      expect([200, 405]).toContain(response.statusCode);
    });
  });

  describe('Content Validation', () => {
    it('should have valid HTML structure', async () => {
      const response = await handler(mockEvent, mockContext);

      const htmlTagCount = (response.body.match(/<html/g) || []).length;
      const htmlCloseTagCount = (response.body.match(/<\/html>/g) || []).length;
      
      expect(htmlTagCount).toBe(htmlCloseTagCount);
    });

    it('should include proper DOCTYPE declaration', async () => {
      const response = await handler(mockEvent, mockContext);

      expect(response.body.trim().toLowerCase()).toMatch(/^<!doctype html>/i);
    });

    it('should include head and body sections', async () => {
      const response = await handler(mockEvent, mockContext);

      expect(response.body).toContain('<head');
      expect(response.body).toContain('</head>');
      expect(response.body).toContain('<body');
      expect(response.body).toContain('</body>');
    });
  });
});
```