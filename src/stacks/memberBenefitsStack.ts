import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

/**
 * Props for MemberBenefitsStack
 */
export interface MemberBenefitsStackProps extends cdk.StackProps {
  /**
   * Environment name (dev, staging, prod)
   */
  readonly environment?: string;
  
  /**
   * Enable CORS for API Gateway
   */
  readonly enableCors?: boolean;
  
  /**
   * Retention period for CloudWatch logs
   */
  readonly logRetention?: logs.RetentionDays;
}

/**
 * CDK Stack for Member Benefits feature
 * Defines Lambda functions, API Gateway, DynamoDB tables, and S3 buckets
 * for managing and displaying member benefits data
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly benefitsTable: dynamodb.Table;
  public readonly memberBenefitsTable: dynamodb.Table;
  public readonly assetsTable: dynamodb.Table;
  public readonly assetsBucket: s3.Bucket;
  public readonly getBenefitsFunction: lambda.Function;
  public readonly getMemberBenefitsFunction: lambda.Function;
  public readonly updateMemberBenefitsFunction: lambda.Function;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const enableCors = props?.enableCors ?? true;
    const logRetention = props?.logRetention || logs.RetentionDays.ONE_WEEK;

    // DynamoDB Table for Benefits catalog
    this.benefitsTable = new dynamodb.Table(this, 'BenefitsTable', {
      tableName: `member-benefits-${environment}`,
      partitionKey: {
        name: 'benefitId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'category',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // GSI for querying by category
    this.benefitsTable.addGlobalSecondaryIndex({
      indexName: 'CategoryIndex',
      partitionKey: {
        name: 'category',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'priority',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for querying active benefits
    this.benefitsTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: {
        name: 'status',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // DynamoDB Table for Member-specific benefits
    this.memberBenefitsTable = new dynamodb.Table(this, 'MemberBenefitsTable', {
      tableName: `member-benefits-mapping-${environment}`,
      partitionKey: {
        name: 'memberId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'benefitId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI for querying by benefit status
    this.memberBenefitsTable.addGlobalSecondaryIndex({
      indexName: 'BenefitStatusIndex',
      partitionKey: {
        name: 'memberId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'status',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // DynamoDB Table for tracking benefit assets metadata
    this.assetsTable = new dynamodb.Table(this, 'BenefitAssetsTable', {
      tableName: `member-benefits-assets-${environment}`,
      partitionKey: {
        name: 'assetId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // S3 Bucket for benefit assets (images, documents, etc.)
    this.assetsBucket = new s3.Bucket(this, 'BenefitAssetsBucket', {
      bucketName: `member-benefits-assets-${environment}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          noncurrentVersionExpiration: cdk.Duration.days(90),
        },
      ],
      cors: enableCors ? [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ] : undefined,
    });

    // IAM Role for Lambda functions
    const lambdaRole = new iam.Role(this, 'MemberBenefitsLambdaRole', {
      roleName: `member-benefits-lambda-role-${environment}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess'),
      ],
    });

    // Grant DynamoDB permissions
    this.benefitsTable.grantReadData(lambdaRole);
    this.memberBenefitsTable.grantReadWriteData(lambdaRole);
    this.assetsTable.grantReadData(lambdaRole);

    // Grant S3 permissions
    this.assetsBucket.grantRead(lambdaRole);

    // Common Lambda environment variables
    const commonEnvironment = {
      BENEFITS_TABLE_NAME: this.benefitsTable.tableName,
      MEMBER_BENEFITS_TABLE_NAME: this.memberBenefitsTable.tableName,
      ASSETS_TABLE_NAME: this.assetsTable.tableName,
      ASSETS_BUCKET_NAME: this.assetsBucket.bucketName,
      ENVIRONMENT: environment,
      LOG_LEVEL: 'INFO',
    };

    // Lambda function to get all benefits
    this.getBenefitsFunction = new lambda.Function(this, 'GetBenefitsFunction', {
      functionName: `member-benefits-get-benefits-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/getBenefits')),
      role: lambdaRole,
      environment: commonEnvironment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      tracing: lambda.Tracing.ACTIVE,
      logRetention,
      description: 'Retrieves all available member benefits',
    });

    // Lambda function to get member-specific benefits
    this.getMemberBenefitsFunction = new lambda.Function(this, 'GetMemberBenefitsFunction', {
      functionName: `member-benefits-get-member-benefits-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/getMemberBenefits')),
      role: lambdaRole,
      environment: commonEnvironment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      tracing: lambda.Tracing.ACTIVE,
      logRetention,
      description: 'Retrieves benefits for a specific member',
    });

    // Lambda function to update member benefits
    this.updateMemberBenefitsFunction = new lambda.Function(this, 'UpdateMemberBenefitsFunction', {
      functionName: `member-benefits-update-member-benefits-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/updateMemberBenefits')),
      role: lambdaRole,
      environment: commonEnvironment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      tracing: lambda.Tracing.ACTIVE,
      logRetention,
      description: 'Updates member benefit status and preferences',
    });

    // API Gateway REST API
    this.api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `member-benefits-api-${environment}`,
      description: 'API for Member Benefits feature',
      deployOptions: {
        stageName: environment,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: enableCors ? {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      } : undefined,
      cloudWatchRole: true,
    });

    // API Resources
    const benefitsResource = this.api.root.addResource('benefits');
    const memberBenefitsResource = this.api.root.addResource('member-benefits');
    const memberIdResource = memberBenefitsResource.addResource('{memberId}');

    // GET /benefits - Get all benefits
    benefitsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(this.getBenefitsFunction, {
        proxy: true,
        integrationResponses: [
          {
            statusCode: '200',
          },
        ],
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseModels: {
              'application/json': apigateway.Model.EMPTY_MODEL,
            },
          },
        ],
      }
    );

    // GET /member-benefits/{memberId} - Get member-specific benefits
    memberIdResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(this.getMemberBenefitsFunction, {
        proxy: true,
        integrationResponses: [
          {
            statusCode: '200',
          },
        ],
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseModels: {
              'application/json': apigateway.Model.EMPTY_MODEL,
            },
          },
        ],
        requestParameters: {
          'method.request.path.memberId': true,
        },
      }
    );

    // PUT /member-benefits/{memberId} - Update member benefits
    memberIdResource.addMethod(
      'PUT',
      new apigateway.LambdaIntegration(this.updateMemberBenefitsFunction, {
        proxy: true,
        integrationResponses: [
          {
            statusCode: '200',
          },
        ],
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseModels: {
              'application/json': apigateway.Model.EMPTY_MODEL,
            },
          },
        ],
        requestParameters: {
          'method.request.path.memberId': true,
        },
      }
    );

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'Member Benefits API Gateway endpoint',
      exportName: `member-benefits-api-endpoint-${environment}`,
    });

    new cdk.CfnOutput(this, 'BenefitsTableName', {
      value: this.benefitsTable.tableName,
      description: 'Benefits DynamoDB table name',
      exportName: `member-benefits-table-name-${environment}`,
    });

    new cdk.CfnOutput(this, 'MemberBenefitsTableName', {
      value: this.memberBenefitsTable.tableName,
      description: 'Member Benefits mapping DynamoDB table name',
      exportName: `member-benefits-mapping-table-name-${environment}`,
    });

    new cdk.CfnOutput(this, 'AssetsBucketName', {
      value: this.assetsBucket.bucketName,
      description: 'Benefits assets S3 bucket name',
      exportName: `member-benefits-assets-bucket-name-${environment}`,
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}
```