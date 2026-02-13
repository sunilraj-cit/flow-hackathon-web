import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

/**
 * Props for MemberBenefitsStack
 */
export interface MemberBenefitsStackProps extends cdk.StackProps {
  /**
   * Environment name (e.g., 'dev', 'staging', 'prod')
   */
  readonly environment?: string;
  
  /**
   * Custom domain name for CloudFront distribution
   */
  readonly domainName?: string;
}

/**
 * CDK Stack for Member Benefits Login Infrastructure
 * 
 * This stack provisions:
 * - API Gateway endpoint for login operations
 * - Lambda function for authentication
 * - IAM roles and policies
 * - S3 bucket for static assets
 * - CloudFront distribution for content delivery
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly loginFunction: lambda.Function;
  public readonly staticBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const envName = props?.environment || 'dev';

    // Create S3 bucket for static website hosting
    this.staticBucket = this.createStaticBucket(envName);

    // Create IAM role for Lambda function
    const lambdaRole = this.createLambdaRole(envName);

    // Create Lambda function for login
    this.loginFunction = this.createLoginFunction(envName, lambdaRole);

    // Create API Gateway
    this.api = this.createApiGateway(envName);

    // Create CloudFront distribution
    this.distribution = this.createCloudFrontDistribution(envName);

    // Output important values
    this.createOutputs();
  }

  /**
   * Creates an S3 bucket for hosting static assets
   * 
   * @param envName - Environment name
   * @returns S3 Bucket instance
   */
  private createStaticBucket(envName: string): s3.Bucket {
    const bucket = new s3.Bucket(this, 'MemberBenefitsStaticBucket', {
      bucketName: `member-benefits-static-${envName}-${this.account}`,
      removalPolicy: envName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: envName !== 'prod',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: envName === 'prod',
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
    });

    cdk.Tags.of(bucket).add('Environment', envName);
    cdk.Tags.of(bucket).add('Project', 'MemberBenefits');

    return bucket;
  }

  /**
   * Creates IAM role for Lambda function with necessary permissions
   * 
   * @param envName - Environment name
   * @returns IAM Role instance
   */
  private createLambdaRole(envName: string): iam.Role {
    const role = new iam.Role(this, 'MemberBenefitsLambdaRole', {
      roleName: `member-benefits-lambda-role-${envName}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'IAM role for Member Benefits login Lambda function',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Add custom policies for additional permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/*`],
      })
    );

    // Add permissions for potential DynamoDB or other AWS services
    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:Query',
          'dynamodb:Scan',
        ],
        resources: [`arn:aws:dynamodb:${this.region}:${this.account}:table/member-benefits-*`],
      })
    );

    cdk.Tags.of(role).add('Environment', envName);
    cdk.Tags.of(role).add('Project', 'MemberBenefits');

    return role;
  }

  /**
   * Creates Lambda function for login authentication
   * 
   * @param envName - Environment name
   * @param role - IAM role for the Lambda function
   * @returns Lambda Function instance
   */
  private createLoginFunction(envName: string, role: iam.Role): lambda.Function {
    const loginFunction = new lambda.Function(this, 'MemberBenefitsLoginFunction', {
      functionName: `member-benefits-login-${envName}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Login request received:', JSON.stringify(event, null, 2));
          
          try {
            const body = JSON.parse(event.body || '{}');
            const { username, password } = body;
            
            if (!username || !password) {
              return {
                statusCode: 400,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                  'Access-Control-Allow-Methods': 'OPTIONS,POST'
                },
                body: JSON.stringify({
                  success: false,
                  message: 'Username and password are required'
                })
              };
            }
            
            // TODO: Implement actual authentication logic
            // This is a placeholder implementation
            
            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
              },
              body: JSON.stringify({
                success: true,
                message: 'Login successful',
                token: 'placeholder-token'
              })
            };
          } catch (error) {
            console.error('Login error:', error);
            return {
              statusCode: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
              },
              body: JSON.stringify({
                success: false,
                message: 'Internal server error'
              })
            };
          }
        };
      `),
      role: role,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        ENVIRONMENT: envName,
        LOG_LEVEL: envName === 'prod' ? 'INFO' : 'DEBUG',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      description: 'Lambda function for member benefits login authentication',
    });

    cdk.Tags.of(loginFunction).add('Environment', envName);
    cdk.Tags.of(loginFunction).add('Project', 'MemberBenefits');

    return loginFunction;
  }

  /**
   * Creates API Gateway REST API with login endpoint
   * 
   * @param envName - Environment name
   * @returns API Gateway RestApi instance
   */
  private createApiGateway(envName: string): apigateway.RestApi {
    const api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `member-benefits-api-${envName}`,
      description: 'API Gateway for Member Benefits login',
      deployOptions: {
        stageName: envName,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: envName !== 'prod',
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
      },
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
    });

    // Create /login resource
    const loginResource = api.root.addResource('login');

    // Create Lambda integration
    const loginIntegration = new apigateway.LambdaIntegration(this.loginFunction, {
      proxy: true,
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          },
        },
      ],
    });

    // Add POST method to /login
    loginResource.addMethod('POST', loginIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
      ],
      apiKeyRequired: false,
    });

    // Add health check endpoint
    const healthResource = api.root.addResource('health');
    healthResource.addMethod(
      'GET',
      new apigateway.MockIntegration({
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': JSON.stringify({
                status: 'healthy',
                timestamp: '$context.requestTime',
              }),
            },
          },
        ],
        requestTemplates: {
          'application/json': '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [{ statusCode: '200' }],
      }
    );

    cdk.Tags.of(api).add('Environment', envName);
    cdk.Tags.of(api).add('Project', 'MemberBenefits');

    return api;
  }

  /**
   * Creates CloudFront distribution for static content delivery
   * 
   * @param envName - Environment name
   * @returns CloudFront Distribution instance
   */
  private createCloudFrontDistribution(envName: string): cloudfront.Distribution {
    // Create Origin Access Identity for S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'MemberBenefitsOAI',
      {
        comment: `OAI for Member Benefits ${envName}`,
      }
    );

    // Grant read permissions to CloudFront
    this.staticBucket.grantRead(originAccessIdentity);

    // Create CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'MemberBenefitsDistribution', {
      comment: `Member Benefits CloudFront Distribution - ${envName}`,
      defaultBehavior: {
        origin: new origins.S3Origin(this.staticBucket, {
          originAccessIdentity: originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    cdk.Tags.of(distribution).add('Environment', envName);
    cdk.Tags.of(distribution).add('Project', 'MemberBenefits');

    return distribution;
  }

  /**
   * Creates CloudFormation outputs for important resource values
   */
  private createOutputs(): void {
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
      exportName: `MemberBenefitsApiEndpoint-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'LoginEndpoint', {
      value: `${this.api.url}login`,
      description: 'Login endpoint URL',
      exportName: `MemberBenefitsLoginEndpoint-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'StaticBucketName', {
      value: this.staticBucket.bucketName,
      description: 'S3 bucket name for static assets',
      exportName: `MemberBenefitsStaticBucket-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value