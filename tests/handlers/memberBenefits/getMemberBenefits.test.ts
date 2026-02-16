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
    process.env.AWS_REGION = 'us-east-1';

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
      stageVariables: null,
      multiValueHeaders: {},
      multiValueQueryStringParameters: null,
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
    delete process.env.AWS_REGION;
  });

  describe('Success Cases', () => {
    it('should return all member benefits successfully', async () => {
      const mockBenefits = [
        {
          id: { S: 'benefit-1' },
          title: { S: 'Health Insurance' },
          description: { S: 'Comprehensive health coverage' },
          category: { S: 'health' },
          isActive: { BOOL: true },
          createdAt: { S: '2024-01-01T00:00:00.000Z' },
          updatedAt: { S: '2024-01-01T00:00:00.000Z' },
        },
        {
          id: { S: 'benefit-2' },
          title: { S: 'Gym Membership' },
          description: { S: 'Access to premium gyms' },
          category: { S: 'wellness' },
          isActive: { BOOL: true },
          createdAt: { S: '2024-01-02T00:00:00.000Z' },
          updatedAt: { S: '2024-01-02T00:00:00.000Z' },
        },
      ];

      dynamoDBMock.on(QueryCommand).resolves({
        Items: mockBenefits,
        Count: 2,
      });

      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.benefits).toHaveLength(2);
      expect(body.benefits[0].id).toBe('benefit-1');
      expect(body.benefits[0].title).toBe('Health Insurance');
      expect(body.benefits[1].id).toBe('benefit-2');
      expect(body.count).toBe(2);
    });

    it('should return empty array when no benefits exist', async () => {
      dynamoDBMock.on(QueryCommand).resolves({
        Items: [],
        Count: 0,
      });

      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.benefits).toEqual([]);
      expect(body.count).toBe(0);
    });

    it('should filter benefits by category when provided', async () => {
      mockEvent.queryStringParameters = { category: 'health' };

      const mockBenefits = [
        {
          id: { S: 'benefit-1' },
          title: { S: 'Health Insurance' },
          description: { S: 'Comprehensive health coverage' },
          category: { S: 'health' },
          isActive: { BOOL: true },
          createdAt: { S: '2024-01-01T00:00:00.000Z' },
          updatedAt: { S: '2024-01-01T00:00:00.000Z' },
        },
      ];

      dynamoDBMock.on(QueryCommand).resolves({
        Items: mockBenefits,
        Count: 1,
      });

      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.benefits).toHaveLength(1);
      expect(body.benefits[0].category).toBe('health');
    });

    it('should return only active benefits when isActive filter is true', async () => {
      mockEvent.queryStringParameters = { isActive: 'true' };

      const mockBenefits = [
        {
          id: { S: 'benefit-1' },
          title: { S: 'Health Insurance' },
          description: { S: 'Comprehensive health coverage' },
          category: { S: 'health' },
          isActive: { BOOL: true },
          createdAt: { S: '2024-01-01T00:00:00.000Z' },
          updatedAt: { S: '2024-01-01T00:00:00.000Z' },
        },
      ];

      dynamoDBMock.on(QueryCommand).resolves({
        Items: mockBenefits,
        Count: 1,
      });

      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.benefits).toHaveLength(1);
      expect(body.benefits[0].isActive).toBe(true);
    });

    it('should handle pagination with limit parameter', async () => {
      mockEvent.queryStringParameters = { limit: '1' };

      const mockBenefits = [
        {
          id: { S: 'benefit-1' },
          title: { S: 'Health Insurance' },
          description: { S: 'Comprehensive health coverage' },
          category: { S: 'health' },
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

      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.benefits).toHaveLength(1);
      expect(body.lastEvaluatedKey).toBeDefined();
    });

    it('should handle pagination with nextToken parameter', async () => {
      const nextToken = Buffer.from(JSON.stringify({ id: 'benefit-1' })).toString('base64');
      mockEvent.queryStringParameters = { nextToken };

      const mockBenefits = [
        {
          id: { S: 'benefit-2' },
          title: { S: 'Gym Membership' },
          description: { S: 'Access to premium gyms' },
          category: { S: 'wellness' },
          isActive: { BOOL: true },
          createdAt: { S: '2024-01-02T00:00:00.000Z' },
          updatedAt: { S: '2024-01-02T00:00:00.000Z' },
        },
      ];

      dynamoDBMock.on(QueryCommand).resolves({
        Items: mockBenefits,
        Count: 1,
      });

      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.benefits).toHaveLength(1);
      expect(body.benefits[0].id).toBe('benefit-2');
    });

    it('should include CORS headers in response', async () => {
      dynamoDBMock.on(QueryCommand).resolves({
        Items: [],
        Count: 0,
      });

      const response = await handler(mockEvent, mockContext);

      expect(response.headers).toMatchObject({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Content-Type': 'application/json',
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should return 500 when DynamoDB query fails', async () => {
      dynamoDBMock.on(QueryCommand).rejects(new Error('DynamoDB error'));

      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Internal server error');
      expect(body.error).toBeDefined();
    });

    it('should return 500 when MEMBER_BENEFITS_TABLE environment variable is missing', async () => {
      delete process.env.MEMBER_BENEFITS_TABLE;

      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Internal server error');
    });

    it('should return 400 for invalid limit parameter', async () => {
      mockEvent.queryStringParameters = { limit: 'invalid' };

      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Invalid limit parameter');
    });

    it('should return 400 for negative limit parameter', async () => {
      mockEvent.queryStringParameters = { limit: '-1' };

      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Invalid limit parameter');
    });

    it('should return 400 for limit exceeding maximum', async () => {
      mockEvent.queryStringParameters = { limit: '1000' };

      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Limit cannot exceed');
    });

    it('should return 400 for invalid nextToken', async () => {
      mockEvent.queryStringParameters = { nextToken: 'invalid-token' };

      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Invalid nextToken');
    });

    it('should return 400 for invalid isActive parameter', async () => {
      mockEvent.queryStringParameters = { isActive: 'invalid' };

      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Invalid isActive parameter');
    });

    it('should handle DynamoDB throttling error', async () => {
      const throttlingError = new Error('ProvisionedThroughputExceededException');
      throttlingError.name = 'ProvisionedThroughputExceededException';
      dynamoDBMock.on(QueryCommand).rejects(throttlingError);

      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Internal server error');
    });

    it('should handle DynamoDB resource not found error', async () => {
      const notFoundError = new Error('ResourceNotFoundException');
      notFoundError.name = 'ResourceNotFoundException';
      dynamoDBMock.on(QueryCommand).rejects(notFoundError);

      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Internal server error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle benefits with missing optional fields', async () => {
      const mockBenefits = [
        {
          id: { S: 'benefit-1' },
          title: { S: 'Basic Benefit' },
          category: { S: 'general' },
          isActive: { BOOL: true },
          createdAt: { S: '2024-01-01T00:00:00.000Z' },
          updatedAt: { S: '2024-01-01T00:00:00.000Z' },
        },
      ];

      dynamoDBMock.on(QueryCommand).resolves({
        Items: mockBenefits,
        Count: 1,
      });

      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.benefits).toHaveLength(1);
      expect(body.benefits[0].description).toBeUndefined();
    });

    it('should handle benefits with additional fields', async () => {
      const mockBenefits = [
        {
          id: { S: 'benefit-1' },
          title: { S: 'Premium Benefit' },
          description: { S: 'Premium coverage' },
          category: { S: 'premium' },
          isActive: { BOOL: true },
          createdAt: { S: '2024-01-01T00:00:00.000Z' },
          updatedAt: { S: '2024-01-01T00:00:00.000Z' },
          customField: { S: 'custom value' },
          metadata: { M: { key: { S: 'value' } } },
        },
      ];

      dynamoDBMock.on(QueryCommand).resolves({
        Items: mockBenefits,
        Count: 1,
      });

      const response = await handler(mockEvent, mockContext);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.benefits).toHaveLength(1);
    });

    it('should handle empty query string parameters', async () => {
      mockEvent.queryStringParameters = {};

      dynamoDBMock