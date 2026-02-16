import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../../../src/handlers/memberBenefits/getMemberBenefits';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

const dynamoDBMock = mockClient(DynamoDBClient);

describe('getMemberBenefits Lambda Handler', () => {
  let mockEvent: APIGatewayProxyEvent;
  let mockContext: Context;

  beforeEach(() => {
    dynamoDBMock.reset();
    process.env.MEMBER_BENEFITS_TABLE = 'test-member-benefits-table';

    mockEvent = {
      httpMethod: 'GET',
      path: '/member-benefits',
      headers: {},
      queryStringParameters: null,
      pathParameters: null,
      body: null,
      isBase64Encoded: false,
      requestContext: {} as any,
      resource: '',
      multiValueHeaders: {},
      multiValueQueryStringParameters: null,
      stageVariables: null,
    };

    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'test-function',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      memoryLimitInMB: '128',
      awsRequestId: 'test-request-id',
      logGroupName: 'test-log-group',
      logStreamName: 'test-log-stream',
      getRemainingTimeInMillis: () => 30000,
      done: () => {},
      fail: () => {},
      succeed: () => {},
    };
  });

  afterEach(() => {
    delete process.env.MEMBER_BENEFITS_TABLE;
  });

  describe('Success Cases', () => {
    it('should return all member benefits successfully', async () => {
      const mockBenefits = [
        {
          id: { S: 'benefit-1' },
          title: { S: 'Premium Support' },
          description: { S: '24/7 customer support' },
          category: { S: 'support' },
          tier: { S: 'premium' },
          isActive: { BOOL: true },
          createdAt: { S: '2024-01-01T00:00:00.000Z' },
          updatedAt: { S: '2024-01-01T00:00:00.000Z' },
        },
        {
          id: { S: 'benefit-2' },
          title: { S: 'Exclusive Content' },
          description: { S: 'Access to premium content' },
          category: { S: 'content' },
          tier: { S: 'premium' },
          isActive: { BOOL: true },
          createdAt: { S: '2024-01-02T00:00:00.000Z' },
          updatedAt: { S: '2024-01-02T00:00:00.000Z' },
        },
      ];

      dynamoDBMock.on(QueryCommand).resolves({
        Items: mockBenefits,
        Count: 2,
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.benefits).toHaveLength(2);
      expect(body.benefits[0].id).toBe('benefit-1');
      expect(body.benefits[0].title).toBe('Premium Support');
      expect(body.benefits[1].id).toBe('benefit-2');
      expect(body.count).toBe(2);
    });

    it('should return filtered benefits by category', async () => {
      mockEvent.queryStringParameters = { category: 'support' };

      const mockBenefits = [
        {
          id: { S: 'benefit-1' },
          title: { S: 'Premium Support' },
          description: { S: '24/7 customer support' },
          category: { S: 'support' },
          tier: { S: 'premium' },
          isActive: { BOOL: true },
          createdAt: { S: '2024-01-01T00:00:00.000Z' },
          updatedAt: { S: '2024-01-01T00:00:00.000Z' },
        },
      ];

      dynamoDBMock.on(QueryCommand).resolves({
        Items: mockBenefits,
        Count: 1,
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.benefits).toHaveLength(1);
      expect(body.benefits[0].category).toBe('support');
    });

    it('should return filtered benefits by tier', async () => {
      mockEvent.queryStringParameters = { tier: 'premium' };

      const mockBenefits = [
        {
          id: { S: 'benefit-1' },
          title: { S: 'Premium Support' },
          description: { S: '24/7 customer support' },
          category: { S: 'support' },
          tier: { S: 'premium' },
          isActive: { BOOL: true },
          createdAt: { S: '2024-01-01T00:00:00.000Z' },
          updatedAt: { S: '2024-01-01T00:00:00.000Z' },
        },
      ];

      dynamoDBMock.on(QueryCommand).resolves({
        Items: mockBenefits,
        Count: 1,
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.benefits).toHaveLength(1);
      expect(body.benefits[0].tier).toBe('premium');
    });

    it('should return only active benefits when isActive filter is true', async () => {
      mockEvent.queryStringParameters = { isActive: 'true' };

      const mockBenefits = [
        {
          id: { S: 'benefit-1' },
          title: { S: 'Premium Support' },
          description: { S: '24/7 customer support' },
          category: { S: 'support' },
          tier: { S: 'premium' },
          isActive: { BOOL: true },
          createdAt: { S: '2024-01-01T00:00:00.000Z' },
          updatedAt: { S: '2024-01-01T00:00:00.000Z' },
        },
      ];

      dynamoDBMock.on(QueryCommand).resolves({
        Items: mockBenefits,
        Count: 1,
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.benefits).toHaveLength(1);
      expect(body.benefits[0].isActive).toBe(true);
    });

    it('should return empty array when no benefits exist', async () => {
      dynamoDBMock.on(QueryCommand).resolves({
        Items: [],
        Count: 0,
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.benefits).toEqual([]);
      expect(body.count).toBe(0);
    });

    it('should handle pagination with limit parameter', async () => {
      mockEvent.queryStringParameters = { limit: '1' };

      const mockBenefits = [
        {
          id: { S: 'benefit-1' },
          title: { S: 'Premium Support' },
          description: { S: '24/7 customer support' },
          category: { S: 'support' },
          tier: { S: 'premium' },
          isActive: { BOOL: true },
          createdAt: { S: '2024-01-01T00:00:00.000Z' },
          updatedAt: { S: '2024-01-01T00:00:00.000Z' },
        },
      ];

      dynamoDBMock.on(QueryCommand).resolves({
        Items: mockBenefits,
        Count: 1,
        LastEvaluatedKey: { id: { S: 'benefit-1' } },
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.benefits).toHaveLength(1);
      expect(body.lastEvaluatedKey).toBeDefined();
    });

    it('should handle pagination with lastEvaluatedKey parameter', async () => {
      mockEvent.queryStringParameters = {
        lastEvaluatedKey: JSON.stringify({ id: 'benefit-1' }),
      };

      const mockBenefits = [
        {
          id: { S: 'benefit-2' },
          title: { S: 'Exclusive Content' },
          description: { S: 'Access to premium content' },
          category: { S: 'content' },
          tier: { S: 'premium' },
          isActive: { BOOL: true },
          createdAt: { S: '2024-01-02T00:00:00.000Z' },
          updatedAt: { S: '2024-01-02T00:00:00.000Z' },
        },
      ];

      dynamoDBMock.on(QueryCommand).resolves({
        Items: mockBenefits,
        Count: 1,
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.benefits).toHaveLength(1);
      expect(body.benefits[0].id).toBe('benefit-2');
    });

    it('should handle multiple query parameters', async () => {
      mockEvent.queryStringParameters = {
        category: 'support',
        tier: 'premium',
        isActive: 'true',
      };

      const mockBenefits = [
        {
          id: { S: 'benefit-1' },
          title: { S: 'Premium Support' },
          description: { S: '24/7 customer support' },
          category: { S: 'support' },
          tier: { S: 'premium' },
          isActive: { BOOL: true },
          createdAt: { S: '2024-01-01T00:00:00.000Z' },
          updatedAt: { S: '2024-01-01T00:00:00.000Z' },
        },
      ];

      dynamoDBMock.on(QueryCommand).resolves({
        Items: mockBenefits,
        Count: 1,
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.benefits).toHaveLength(1);
      expect(body.benefits[0].category).toBe('support');
      expect(body.benefits[0].tier).toBe('premium');
      expect(body.benefits[0].isActive).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    it('should return 500 when MEMBER_BENEFITS_TABLE environment variable is not set', async () => {
      delete process.env.MEMBER_BENEFITS_TABLE;

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.message).toContain('Configuration error');
    });

    it('should return 500 when DynamoDB query fails', async () => {
      dynamoDBMock.on(QueryCommand).rejects(new Error('DynamoDB error'));

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.message).toContain('Failed to retrieve member benefits');
    });

    it('should return 500 when DynamoDB returns malformed data', async () => {
      dynamoDBMock.on(QueryCommand).resolves({
        Items: [
          {
            id: { S: 'benefit-1' },
            // Missing required fields
          },
        ],
        Count: 1,
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.message).toBeDefined();
    });

    it('should return 400 for invalid limit parameter', async () => {
      mockEvent.queryStringParameters = { limit: 'invalid' };

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toContain('Invalid limit parameter');
    });

    it('should return 400 for negative limit parameter', async () => {
      mockEvent.queryStringParameters = { limit: '-1' };

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toContain('Invalid limit parameter');
    });

    it('should return 400 for invalid lastEvaluatedKey JSON', async () => {
      mockEvent.queryStringParameters = { lastEvaluatedKey: 'invalid-json' };

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toContain('Invalid lastEvaluatedKey parameter');
    });

    it('should return 400 for invalid isActive parameter', async () => {
      mockEvent.queryStringParameters = { isActive: 'invalid' };

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toContain('Invalid isActive parameter');
    });

    it('should handle DynamoDB throttling error', async () => {
      const throttlingError = new Error('ProvisionedThroughputExceededException');
      throttlingError.name = 'ProvisionedThroughputExceededException';
      dynamoDBMock.on(QueryCommand).rejects(throttlingError);

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.message).toContain('Failed to retrieve member benefits');
    });

    it('should handle DynamoDB resource not found error', async () => {
      const notFoundError = new Error('ResourceNotFoundException');
      notFoundError.name = 'ResourceNotFoundException';
      dynamoDBMock.on(QueryCommand).rejects(notFoundError);

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.message).toContain('Failed to retrieve member benefits');
    });
  });

  describe('Edge Cases