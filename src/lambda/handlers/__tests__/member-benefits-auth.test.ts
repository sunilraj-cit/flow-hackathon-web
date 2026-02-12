import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler } from '../member-benefits-auth';

/**
 * Mock AWS Lambda Context
 */
const createMockContext = (): Context => ({
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'member-benefits-auth',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:member-benefits-auth',
  memoryLimitInMB: '128',
  awsRequestId: 'test-request-id',
  logGroupName: '/aws/lambda/member-benefits-auth',
  logStreamName: '2024/01/01/[$LATEST]test',
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
});

/**
 * Create mock API Gateway Proxy Event
 */
const createMockEvent = (overrides?: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent => ({
  body: null,
  headers: {},
  multiValueHeaders: {},
  httpMethod: 'POST',
  isBase64Encoded: false,
  path: '/auth/login',
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {
    accountId: '123456789012',
    apiId: 'test-api-id',
    protocol: 'HTTP/1.1',
    httpMethod: 'POST',
    path: '/auth/login',
    stage: 'test',
    requestId: 'test-request-id',
    requestTime: '01/Jan/2024:00:00:00 +0000',
    requestTimeEpoch: 1704067200000,
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
    authorizer: null,
    resourceId: 'test-resource-id',
    resourcePath: '/auth/login',
  },
  resource: '/auth/login',
  ...overrides,
});

describe('Member Benefits Auth Lambda Handler', () => {
  let mockContext: Context;

  beforeEach(() => {
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  describe('Success Scenarios', () => {
    it('should successfully authenticate with valid credentials', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPassword123!',
        }),
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('token');
      expect(body).toHaveProperty('user');
      expect(body.user).toHaveProperty('email', 'test@example.com');
      expect(body).toHaveProperty('expiresIn');
    });

    it('should return user profile information on successful authentication', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          email: 'member@example.com',
          password: 'SecurePass456!',
        }),
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.user).toHaveProperty('id');
      expect(body.user).toHaveProperty('email');
      expect(body.user).toHaveProperty('membershipLevel');
      expect(body.user).not.toHaveProperty('password');
    });

    it('should handle case-insensitive email addresses', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          email: 'Test@Example.COM',
          password: 'ValidPassword123!',
        }),
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.user.email.toLowerCase()).toBe('test@example.com');
    });
  });

  describe('Failure Scenarios', () => {
    it('should return 401 for invalid credentials', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'WrongPassword',
        }),
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(401);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toMatch(/invalid credentials|authentication failed/i);
    });

    it('should return 401 for non-existent user', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        }),
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(401);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('error');
    });

    it('should return 400 for missing request body', async () => {
      const event = createMockEvent({
        body: null,
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toMatch(/request body|required/i);
    });

    it('should return 400 for malformed JSON', async () => {
      const event = createMockEvent({
        body: '{invalid json}',
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toMatch(/invalid|malformed|json/i);
    });

    it('should return 405 for unsupported HTTP methods', async () => {
      const event = createMockEvent({
        httpMethod: 'GET',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPassword123!',
        }),
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(405);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toMatch(/method not allowed/i);
    });

    it('should return 429 for rate limit exceeded', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPassword123!',
        }),
        headers: {
          'X-Rate-Limit-Exceeded': 'true',
        },
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(429);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toMatch(/rate limit|too many requests/i);
    });

    it('should handle internal server errors gracefully', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          email: 'error@example.com',
          password: 'TriggerError123!',
        }),
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect([500, 503]).toContain(result.statusCode);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toMatch(/server error|service unavailable/i);
    });
  });

  describe('Validation Scenarios', () => {
    it('should return 400 for missing email field', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          password: 'ValidPassword123!',
        }),
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toMatch(/email.*required/i);
    });

    it('should return 400 for missing password field', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toMatch(/password.*required/i);
    });

    it('should return 400 for invalid email format', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'ValidPassword123!',
        }),
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toMatch(/email.*invalid|invalid.*email/i);
    });

    it('should return 400 for empty email string', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          email: '',
          password: 'ValidPassword123!',
        }),
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toMatch(/email.*required|email.*empty/i);
    });

    it('should return 400 for empty password string', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          email: 'test@example.com',
          password: '',
        }),
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toMatch(/password.*required|password.*empty/i);
    });

    it('should return 400 for password shorter than minimum length', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          email: 'test@example.com',
          password: '123',
        }),
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toMatch(/password.*length|password.*short/i);
    });

    it('should return 400 for email exceeding maximum length', async () => {
      const longEmail = 'a'.repeat(256) + '@example.com';
      const event = createMockEvent({
        body: JSON.stringify({
          email: longEmail,
          password: 'ValidPassword123!',
        }),
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toMatch(/email.*length|email.*long/i);
    });

    it('should sanitize and validate special characters in email', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          email: 'test+tag@example.com',
          password: 'ValidPassword123!',
        }),
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect([200, 401]).toContain(result.statusCode);
    });

    it('should reject SQL injection attempts in email field', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          email: "admin'--@example.com",
          password: 'ValidPassword123!',
        }),
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('error');
    });

    it('should reject XSS attempts in input fields', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          email: '<script>alert("xss")</script>@example.com',
          password: 'ValidPassword123!',
        }),
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('error');
    });
  });

  describe('CORS and Headers', () => {
    it('should include CORS headers in successful response', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPassword123!',
        }),
      });

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(result.headers).toHaveProperty('Access-Control-Allow-Headers');
      expect(result.headers).toHaveProperty('Access-Control-Allow-Methods');
    });

    it('should include CORS headers in error response', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          email: 'invalid',
          password: 'test',
        }),
      });

      const result = await handler(event, mockContext) as APIGat