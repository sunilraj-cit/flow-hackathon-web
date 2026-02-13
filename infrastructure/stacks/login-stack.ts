import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

/**
 * Properties for the LoginStack
 */
export interface LoginStackProps extends cdk.StackProps {
  /**
   * Environment name (e.g., dev, staging, prod)
   */
  readonly environment?: string;

  /**
   * Custom domain name for CloudFront distribution
   */
  readonly domainName?: string;

  /**
   * Lambda function timeout in seconds
   * @default 30
   */
  readonly lambdaTimeout?: number;

  /**
   * Lambda function memory size in MB
   * @default 512
   */
  readonly lambdaMemorySize?: number;
}

/**
 * CDK Stack for provisioning login page infrastructure
 * Includes Lambda function, API Gateway endpoint, and CloudFront distribution
 * 
 * @remarks
 * This stack provisions the infrastructure for PM-105: Member benefits login page
 * with responsive design and red button CTA
 */
export class LoginStack extends cdk.Stack {
  public readonly loginFunction: lambda.Function;
  public readonly api: apigateway.RestApi;
  public readonly distribution: cloudfront.Distribution;
  public readonly staticBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: LoginStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const lambdaTimeout = props?.lambdaTimeout || 30;
    const lambdaMemorySize = props?.lambdaMemorySize || 512;

    // S3 bucket for static assets (login page HTML, CSS, JS)
    this.staticBucket = new s3.Bucket(this, 'LoginStaticBucket', {
      bucketName: `login-static-${environment}-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3600,
        },
      ],
    });

    // Lambda execution role
    const lambdaRole = new iam.Role(this, 'LoginLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for login Lambda function',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Lambda function for login authentication
    this.loginFunction = new lambda.Function(this, 'LoginFunction', {
      functionName: `login-handler-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/login')),
      timeout: cdk.Duration.seconds(lambdaTimeout),
      memorySize: lambdaMemorySize,
      role: lambdaRole,
      environment: {
        ENVIRONMENT: environment,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
        LOG_LEVEL: environment === 'prod' ? 'info' : 'debug',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
      description: 'Lambda function for member benefits login authentication',
    });

    // API Gateway REST API
    this.api = new apigateway.RestApi(this, 'LoginApi', {
      restApiName: `login-api-${environment}`,
      description: 'API Gateway for member benefits login',
      deployOptions: {
        stageName: environment,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: environment !== 'prod',
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

    // API Gateway Lambda integration
    const loginIntegration = new apigateway.LambdaIntegration(this.loginFunction, {
      proxy: true,
      allowTestInvoke: true,
      timeout: cdk.Duration.seconds(29),
    });

    // API Gateway resources and methods
    const loginResource = this.api.root.addResource('login');
    loginResource.addMethod('POST', loginIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
      apiKeyRequired: false,
    });

    // Health check endpoint
    const healthResource = this.api.root.addResource('health');
    healthResource.addMethod('GET', loginIntegration);

    // Origin Access Identity for CloudFront to access S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'LoginOAI', {
      comment: 'OAI for login page CloudFront distribution',
    });

    this.staticBucket.grantRead(originAccessIdentity);

    // CloudFront cache policy for static assets
    const staticCachePolicy = new cloudfront.CachePolicy(this, 'StaticCachePolicy', {
      cachePolicyName: `login-static-cache-${environment}`,
      comment: 'Cache policy for login page static assets',
      defaultTtl: cdk.Duration.days(1),
      minTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.days(365),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    // CloudFront cache policy for API requests
    const apiCachePolicy = new cloudfront.CachePolicy(this, 'ApiCachePolicy', {
      cachePolicyName: `login-api-cache-${environment}`,
      comment: 'Cache policy for login API requests',
      defaultTtl: cdk.Duration.seconds(0),
      minTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(1),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'Authorization',
        'Content-Type',
        'Accept'
      ),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: cloudfront.CacheCookieBehavior.all(),
    });

    // CloudFront origin request policy for API
    const apiOriginRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'ApiOriginRequestPolicy', {
      originRequestPolicyName: `login-api-origin-${environment}`,
      comment: 'Origin request policy for login API',
      headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
        'Authorization',
        'Content-Type',
        'Accept',
        'Origin',
        'Referer'
      ),
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
      cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
    });

    // CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'LoginDistribution', {
      comment: `Login page distribution for ${environment}`,
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enableLogging: true,
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultBehavior: {
        origin: new origins.S3Origin(this.staticBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: staticCachePolicy,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.RestApiOrigin(this.api, {
            originPath: `/${environment}`,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
          cachePolicy: apiCachePolicy,
          originRequestPolicy: apiOriginRequestPolicy,
        },
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(300),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(300),
        },
      ],
    });

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'LoginFunctionArn', {
      value: this.loginFunction.functionArn,
      description: 'ARN of the login Lambda function',
      exportName: `login-function-arn-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginApiUrl', {
      value: this.api.url,
      description: 'URL of the login API Gateway',
      exportName: `login-api-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginDistributionUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL for login page',
      exportName: `login-distribution-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `login-distribution-id-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginStaticBucketName', {
      value: this.staticBucket.bucketName,
      description: 'S3 bucket name for login static assets',
      exportName: `login-static-bucket-${environment}`,
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('Component', 'Login');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Ticket', 'PM-105');
  }
}
```