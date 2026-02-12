import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler } from '../../src/handlers/member-benefits-login';

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
  };
};

/**
 * Creates a mock Lambda Context for testing
 */
const createMockContext = (): Context => {
  return {
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
};

describe('Member Benefits Login Handler', () => {
  let mockEvent: APIGatewayProxyEvent;
  let mockContext: Context;

  beforeEach(() => {
    mockEvent = createMockEvent();
    mockContext = createMockContext();
  });

  describe('Response Validation', () => {
    it('should return a 200 status code', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
    });

    it('should return correct content-type header', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.headers).toBeDefined();
      expect(result.headers?.['Content-Type']).toBe('text/html');
    });

    it('should return cache-control headers', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.headers).toBeDefined();
      expect(result.headers?.['Cache-Control']).toBeDefined();
    });

    it('should return a non-empty body', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.body).toBeDefined();
      expect(result.body.length).toBeGreaterThan(0);
    });

    it('should return valid HTML structure', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.body).toContain('<!DOCTYPE html>');
      expect(result.body).toContain('<html');
      expect(result.body).toContain('</html>');
    });
  });

  describe('HTML Content Validation', () => {
    it('should contain required HTML head elements', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.body).toContain('<head>');
      expect(result.body).toContain('</head>');
      expect(result.body).toContain('<meta charset="UTF-8">');
      expect(result.body).toContain('<meta name="viewport"');
    });

    it('should contain a title element', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.body).toContain('<title>');
      expect(result.body).toContain('</title>');
      expect(result.body).toMatch(/Member Benefits.*Login/i);
    });

    it('should contain a body element', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.body).toContain('<body');
      expect(result.body).toContain('</body>');
    });

    it('should contain a login form', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.body).toContain('<form');
      expect(result.body).toContain('</form>');
    });

    it('should contain email/username input field', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.body).toMatch(/<input[^>]*type=["'](?:email|text)["'][^>]*>/i);
    });

    it('should contain password input field', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.body).toMatch(/<input[^>]*type=["']password["'][^>]*>/i);
    });

    it('should contain a red button', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.body).toContain('<button');
      expect(result.body).toMatch(/background-color:\s*red|bg-red|#[fF]{2}0{4}|rgb\(255,\s*0,\s*0\)/);
    });

    it('should contain responsive meta viewport tag', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.body).toMatch(/<meta\s+name=["']viewport["']\s+content=["'][^"']*width=device-width[^"']*["']/i);
    });
  });

  describe('Responsive Design Validation', () => {
    it('should contain CSS for responsive design', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      const hasStyleTag = result.body.includes('<style>') || result.body.includes('<link');
      const hasMediaQuery = result.body.includes('@media');
      const hasResponsiveClasses = result.body.match(/max-width|min-width|flex|grid/);

      expect(hasStyleTag || hasMediaQuery || hasResponsiveClasses).toBeTruthy();
    });

    it('should contain mobile-friendly CSS properties', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      const hasMobileProperties = 
        result.body.includes('max-width') ||
        result.body.includes('min-width') ||
        result.body.includes('flex') ||
        result.body.includes('grid') ||
        result.body.includes('@media');

      expect(hasMobileProperties).toBeTruthy();
    });
  });

  describe('Accessibility Validation', () => {
    it('should contain proper label elements for inputs', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.body).toContain('<label');
    });

    it('should have lang attribute on html tag', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.body).toMatch(/<html[^>]*lang=["'][^"']+["']/i);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed events gracefully', async () => {
      const malformedEvent = {} as APIGatewayProxyEvent;

      const result = await handler(malformedEvent, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBeDefined();
      expect([200, 400, 500]).toContain(result.statusCode);
    });

    it('should return a valid response structure even with null context', async () => {
      const result = await handler(mockEvent, null as any) as APIGatewayProxyResult;

      expect(result).toHaveProperty('statusCode');
      expect(result).toHaveProperty('body');
      expect(result).toHaveProperty('headers');
    });
  });

  describe('Security Headers', () => {
    it('should include security-related headers', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.headers).toBeDefined();
      
      const hasSecurityHeaders = 
        result.headers?.['X-Content-Type-Options'] ||
        result.headers?.['X-Frame-Options'] ||
        result.headers?.['Content-Security-Policy'];

      expect(hasSecurityHeaders).toBeDefined();
    });
  });

  describe('Button Styling', () => {
    it('should have a button with red color styling', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      const redColorPatterns = [
        /background-color:\s*red/i,
        /background:\s*red/i,
        /bg-red/i,
        /#[fF]{2}0{4}/,
        /rgb\(255,\s*0,\s*0\)/,
        /rgba\(255,\s*0,\s*0/,
      ];

      const hasRedButton = redColorPatterns.some(pattern => pattern.test(result.body));
      expect(hasRedButton).toBeTruthy();
    });

    it('should have a submit button in the form', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      const hasSubmitButton = 
        result.body.match(/<button[^>]*type=["']submit["'][^>]*>/i) ||
        result.body.match(/<input[^>]*type=["']submit["'][^>]*>/i);

      expect(hasSubmitButton).toBeTruthy();
    });
  });

  describe('Basic Design Requirements', () => {
    it('should maintain a simple and basic design structure', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      const formCount = (result.body.match(/<form/g) || []).length;
      expect(formCount).toBeLessThanOrEqual(1);
    });

    it('should contain member benefits branding or reference', async () => {
      const result = await handler(mockEvent, mockContext) as APIGatewayProxyResult;

      expect(result.body).toMatch(/member\s*benefits/i);
    });
  });
});
```