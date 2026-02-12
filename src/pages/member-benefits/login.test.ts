import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler } from './login';

describe('Member Benefits Login Lambda Handler', () => {
  let mockContext: Context;

  beforeEach(() => {
    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'test-function',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      memoryLimitInMB: '128',
      awsRequestId: 'test-request-id',
      logGroupName: '/aws/lambda/test-function',
      logStreamName: '2024/01/01/[$LATEST]test',
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };

    process.env.JWT_SECRET = 'test-secret-key';
    process.env.MEMBER_BENEFITS_TABLE = 'test-member-benefits-table';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Success Scenarios', () => {
    it('should return 200 with valid token when credentials are correct', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPassword123!',
        }),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/member-benefits/login',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

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
      expect(body.user).not.toHaveProperty('password');
    });

    it('should return user profile information on successful login', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({
          email: 'member@example.com',
          password: 'SecurePass456!',
        }),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/member-benefits/login',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.user).toHaveProperty('email');
      expect(body.user).toHaveProperty('memberId');
      expect(body.user).toHaveProperty('membershipLevel');
    });

    it('should handle case-insensitive email addresses', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({
          email: 'TEST@EXAMPLE.COM',
          password: 'ValidPassword123!',
        }),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/member-benefits/login',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.user.email.toLowerCase()).toBe('test@example.com');
    });
  });

  describe('Failure Scenarios', () => {
    it('should return 401 when credentials are invalid', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        }),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/member-benefits/login',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('Invalid credentials');
    });

    it('should return 401 when user does not exist', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        }),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/member-benefits/login',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Invalid credentials');
    });

    it('should return 403 when account is locked', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({
          email: 'locked@example.com',
          password: 'ValidPassword123!',
        }),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/member-benefits/login',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Account is locked');
    });

    it('should return 500 when database connection fails', async () => {
      delete process.env.MEMBER_BENEFITS_TABLE;

      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPassword123!',
        }),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/member-benefits/login',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Internal server error');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when request body is missing', async () => {
      const event: APIGatewayProxyEvent = {
        body: null,
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/member-benefits/login',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Request body is required');
    });

    it('should return 400 when request body is invalid JSON', async () => {
      const event: APIGatewayProxyEvent = {
        body: 'invalid-json{',
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/member-benefits/login',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Invalid JSON');
    });

    it('should return 400 when email is missing', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({
          password: 'ValidPassword123!',
        }),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/member-benefits/login',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Email is required');
    });

    it('should return 400 when password is missing', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({
          email: 'test@example.com',
        }),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/member-benefits/login',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Password is required');
    });

    it('should return 400 when email format is invalid', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'ValidPassword123!',
        }),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/member-benefits/login',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Invalid email format');
    });

    it('should return 400 when email is empty string', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({
          email: '',
          password: 'ValidPassword123!',
        }),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/member-benefits/login',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Email is required');
    });

    it('should return 400 when password is empty string', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({
          email: 'test@example.com',
          password: '',
        }),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/member-benefits/login',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Password is required');
    });

    it('should return 400 when password is too short', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'short',
        }),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/member-benefits/login',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const result = await handler(event, mockContext) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Password must be at least');
    });

    it('should return 400 when email exceeds maximum length', async () => {
      const longEmail = 'a'.repeat(255) + '@example.com';
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({
          email: longEmail,
          password: 'ValidPassword123!',
        }),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/member-benefits/login',
        pathParameters