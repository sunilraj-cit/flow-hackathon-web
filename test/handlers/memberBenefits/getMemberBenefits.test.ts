import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../../../src/handlers/memberBenefits/getMemberBenefits';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

const dynamoDBMock = mockClient(DynamoDBClient);

describe('getMemberBenefits Lambda Handler', () => {
  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'getMemberBenefits',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:getMemberBenefits',
    memoryLimitInMB: '128',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/getMemberBenefits',
    logStreamName: '2024/01/01/[$LATEST]test',
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };

  beforeEach(() => {
    dynamoDBMock.reset();
    process.env.MEMBER_BENEFITS_TABLE = 'test-member-benefits-table';
  });

  afterEach(() => {
    delete process.env.MEMBER_BENEFITS_TABLE;
  });

  describe('Success Cases', () => {
    it('should return member benefits successfully', async () => {
      const mockBenefits = [
        {
          id: { S: 'benefit-1' },
          title: { S: 'Premium Support' },
          description: { S: '24/7 customer support access' },
          category: { S: 'support' },
          isActive: { BOOL: true },
          createdAt: { S: '2024-01-01T00:00:00.000Z' },
          updatedAt: { S: '2024-01-01T00:00:00.000Z' },
        },
        {
          id: { S: 'benefit-2' },
          title: { S: 'Exclusive Discounts' },
          description: { S: 'Up to 20% off on all products' },
          category: { S: 'discount' },
          isActive: { BOOL: true },
          createdAt: { S: '2024-01-01T00:00:00.000Z' },
          updatedAt: { S: '2024-01-01T00:00:00.000Z' },
        },
      ];

      dynamoDBMock.on(QueryCommand).resolves({
        Items: mockBenefits,
        Count: 2,
      });

      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/member-benefits',
        headers: {},
        queryStringParameters: null,
        body: null,
        isBase64Encoded: false,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.benefits).toHaveLength(2);
      expect(body.benefits[0].id).toBe('benefit-1');
      expect(body.benefits[0].title).toBe('Premium Support');
      expect(body.benefits[1].id).toBe('benefit-2');
      expect(body.benefits[1].title).toBe('Exclusive Discounts');
    });

    it('should return empty array when no benefits exist', async () => {
      dynamoDBMock.on(QueryCommand).resolves({
        Items: [],
        Count: 0,
      });

      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/member-benefits',
        headers: {},
        queryStringParameters: null,
        body: null,
        isBase64Encoded: false,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.benefits).toEqual([]);
      expect(body.count).toBe(0);
    });

    it('should filter benefits by category when provided', async () => {
      const mockBenefits = [
        {
          id: { S: 'benefit-1' },
          title: { S: 'Premium Support' },
          description: { S: '24/7 customer support access' },
          category: { S: 'support' },
          isActive: { BOOL: true },
          createdAt: { S: '2024-01-01T00:00:00.000Z' },
          updatedAt: { S: '2024-01-01T00:00:00.000Z' },
        },
      ];

      dynamoDBMock.on(QueryCommand).resolves({
        Items: mockBenefits,
        Count: 1,
      });

      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/member-benefits',
        headers: {},
        queryStringParameters: {
          category: 'support',
        },
        body: null,
        isBase64Encoded: false,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.benefits).toHaveLength(1);
      expect(body.benefits[0].category).toBe('support');
    });

    it('should filter only active benefits when isActive parameter is true', async () => {
      const mockBenefits = [
        {
          id: { S: 'benefit-1' },
          title: { S: 'Premium Support' },
          description: { S: '24/7 customer support access' },
          category: { S: 'support' },
          isActive: { BOOL: true },
          createdAt: { S: '2024-01-01T00:00:00.000Z' },
          updatedAt: { S: '2024-01-01T00:00:00.000Z' },
        },
      ];

      dynamoDBMock.on(QueryCommand).resolves({
        Items: mockBenefits,
        Count: 1,
      });

      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/member-benefits',
        headers: {},
        queryStringParameters: {
          isActive: 'true',
        },
        body: null,
        isBase64Encoded: false,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.benefits).toHaveLength(1);
      expect(body.benefits[0].isActive).toBe(true);
    });

    it('should include CORS headers in response', async () => {
      dynamoDBMock.on(QueryCommand).resolves({
        Items: [],
        Count: 0,
      });

      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/member-benefits',
        headers: {},
        queryStringParameters: null,
        body: null,
        isBase64Encoded: false,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
      };

      const result = await handler(event, mockContext);

      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(result.headers).toHaveProperty('Access-Control-Allow-Headers');
      expect(result.headers).toHaveProperty('Content-Type', 'application/json');
    });
  });

  describe('Error Scenarios', () => {
    it('should return 500 when DynamoDB query fails', async () => {
      dynamoDBMock.on(QueryCommand).rejects(new Error('DynamoDB connection error'));

      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/member-benefits',
        headers: {},
        queryStringParameters: null,
        body: null,
        isBase64Encoded: false,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Internal server error');
      expect(body.error).toBeDefined();
    });

    it('should return 500 when table name is not configured', async () => {
      delete process.env.MEMBER_BENEFITS_TABLE;

      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/member-benefits',
        headers: {},
        queryStringParameters: null,
        body: null,
        isBase64Encoded: false,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Internal server error');
    });

    it('should handle malformed DynamoDB response gracefully', async () => {
      dynamoDBMock.on(QueryCommand).resolves({
        Items: [
          {
            id: { S: 'benefit-1' },
            // Missing required fields
          },
        ],
        Count: 1,
      });

      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/member-benefits',
        headers: {},
        queryStringParameters: null,
        body: null,
        isBase64Encoded: false,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.benefits).toBeDefined();
    });

    it('should return 405 for unsupported HTTP methods', async () => {
      const event: APIGatewayProxyEvent = {
        httpMethod: 'POST',
        path: '/member-benefits',
        headers: {},
        queryStringParameters: null,
        body: null,
        isBase64Encoded: false,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(405);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Method not allowed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large result sets', async () => {
      const largeBenefitsList = Array.from({ length: 1000 }, (_, i) => ({
        id: { S: `benefit-${i}` },
        title: { S: `Benefit ${i}` },
        description: { S: `Description for benefit ${i}` },
        category: { S: 'general' },
        isActive: { BOOL: true },
        createdAt: { S: '2024-01-01T00:00:00.000Z' },
        updatedAt: { S: '2024-01-01T00:00:00.000Z' },
      }));

      dynamoDBMock.on(QueryCommand).resolves({
        Items: largeBenefitsList,
        Count: 1000,
      });

      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/member-benefits',
        headers: {},
        queryStringParameters: null,
        body: null,
        isBase64Encoded: false,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.benefits).toHaveLength(1000);
    });

    it('should handle special characters in benefit data', async () => {
      const mockBenefits = [
        {
          id: { S: 'benefit-1' },
          title: { S: 'Premium Support & Services™' },
          description: { S: 'Access to 24/7 support with <special> characters & symbols!' },
          category: { S: 'support' },
          isActive: { BOOL: true },
          createdAt: { S: '2024-01-01T00:00:00.000Z' },
          updatedAt: { S: '2024-01-01T00:00:00.000Z' },
        },
      ];

      dynamoDBMock.on(QueryCommand).resolves({
        Items: mockBenefits,
        Count: 1,
      });

      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/member-benefits',
        headers: {},
        queryStringParameters: null,
        body: null,
        isBase64Encoded: false,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.benefits[0].title).toContain('™');
      expect(body.benefits[0].description).toContain('<special>');
    });

    it('should handle null and undefined query parameters', async () => {
      dynamoDBMock.on(QueryCommand).resolves({
        Items: [],
        Count: 0,
      });

      const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/member-benefits',
        headers: {},
        queryStringParameters: {
          category: undefined as any,
          isActive: null as any,
        },
        body: null,