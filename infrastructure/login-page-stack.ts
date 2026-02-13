import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

/**
 * Props for LoginPageStack
 */
export interface LoginPageStackProps extends cdk.StackProps {
  /**
   * Environment name (e.g., 'dev', 'staging', 'prod')
   */
  readonly environment?: string;
  
  /**
   * Custom domain name for the login page
   */
  readonly domainName?: string;
  
  /**
   * Enable CORS for API Gateway
   */
  readonly enableCors?: boolean;
}

/**
 * CDK Stack for deploying the member benefits login page infrastructure
 * 
 * This stack creates:
 * - S3 bucket for static assets (HTML, CSS, JS)
 * - Lambda function for authentication logic
 * - API Gateway endpoint for login requests
 * - CloudFront distribution for content delivery
 * 
 * @ticket PM-103
 */
export class LoginPageStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly loginFunction: lambda.Function;
  public readonly api: apigateway.RestApi;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: LoginPageStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const enableCors = props?.enableCors ?? true;

    // Create S3 bucket for static assets
    this.bucket = this.createStaticAssetsBucket(environment);

    // Create Lambda function for login authentication
    this.loginFunction = this.createLoginLambdaFunction(environment);

    // Create API Gateway
    this.api = this.createApiGateway(environment, enableCors);

    // Create CloudFront distribution
    this.distribution = this.createCloudFrontDistribution(environment);

    // Output important values
    this.createOutputs();
  }

  /**
   * Creates an S3 bucket for hosting static assets
   * 
   * @param environment - The deployment environment
   * @returns S3 Bucket instance
   */
  private createStaticAssetsBucket(environment: string): s3.Bucket {
    const bucket = new s3.Bucket(this, 'LoginPageAssetsBucket', {
      bucketName: `member-benefits-login-${environment}-${this.account}`,
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3600,
        },
      ],
    });

    // Add bucket policy for CloudFront access
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowCloudFrontServicePrincipal',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        actions: ['s3:GetObject'],
        resources: [bucket.arnForObjects('*')],
      })
    );

    // Tag the bucket
    cdk.Tags.of(bucket).add('Environment', environment);
    cdk.Tags.of(bucket).add('Project', 'MemberBenefitsLogin');
    cdk.Tags.of(bucket).add('Ticket', 'PM-103');

    return bucket;
  }

  /**
   * Creates a Lambda function for handling login authentication
   * 
   * @param environment - The deployment environment
   * @returns Lambda Function instance
   */
  private createLoginLambdaFunction(environment: string): lambda.Function {
    const loginFunction = new lambda.Function(this, 'LoginFunction', {
      functionName: `member-benefits-login-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/login')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: environment,
        BUCKET_NAME: this.bucket.bucketName,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
      },
      tracing: lambda.Tracing.ACTIVE,
      logRetention: environment === 'prod' ? 90 : 7,
      description: 'Lambda function for member benefits login authentication (PM-103)',
    });

    // Grant read access to S3 bucket
    this.bucket.grantRead(loginFunction);

    // Tag the function
    cdk.Tags.of(loginFunction).add('Environment', environment);
    cdk.Tags.of(loginFunction).add('Project', 'MemberBenefitsLogin');
    cdk.Tags.of(loginFunction).add('Ticket', 'PM-103');

    return loginFunction;
  }

  /**
   * Creates an API Gateway REST API with login endpoint
   * 
   * @param environment - The deployment environment
   * @param enableCors - Whether to enable CORS
   * @returns RestApi instance
   */
  private createApiGateway(environment: string, enableCors: boolean): apigateway.RestApi {
    const api = new apigateway.RestApi(this, 'LoginApi', {
      restApiName: `member-benefits-login-api-${environment}`,
      description: 'API Gateway for member benefits login page (PM-103)',
      deployOptions: {
        stageName: environment,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: environment !== 'prod',
        metricsEnabled: true,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
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
        allowCredentials: true,
        maxAge: cdk.Duration.hours(1),
      } : undefined,
      cloudWatchRole: true,
    });

    // Create Lambda integration
    const loginIntegration = new apigateway.LambdaIntegration(this.loginFunction, {
      proxy: true,
      allowTestInvoke: environment !== 'prod',
      timeout: cdk.Duration.seconds(29),
    });

    // Create /login endpoint
    const loginResource = api.root.addResource('login');
    loginResource.addMethod('POST', loginIntegration, {
      apiKeyRequired: false,
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Create /health endpoint for monitoring
    const healthResource = api.root.addResource('health');
    healthResource.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseTemplates: {
          'application/json': JSON.stringify({ status: 'healthy', service: 'login-api' }),
        },
      }],
      requestTemplates: {
        'application/json': JSON.stringify({ statusCode: 200 }),
      },
    }), {
      methodResponses: [{ statusCode: '200' }],
    });

    // Tag the API
    cdk.Tags.of(api).add('Environment', environment);
    cdk.Tags.of(api).add('Project', 'MemberBenefitsLogin');
    cdk.Tags.of(api).add('Ticket', 'PM-103');

    return api;
  }

  /**
   * Creates a CloudFront distribution for content delivery
   * 
   * @param environment - The deployment environment
   * @returns CloudFront Distribution instance
   */
  private createCloudFrontDistribution(environment: string): cloudfront.Distribution {
    // Create Origin Access Identity for S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI for member benefits login ${environment}`,
    });

    this.bucket.grantRead(originAccessIdentity);

    const distribution = new cloudfront.Distribution(this, 'LoginPageDistribution', {
      comment: `Member Benefits Login Page Distribution - ${environment} (PM-103)`,
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.RestApiOrigin(this.api),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: environment === 'prod' 
        ? cloudfront.PriceClass.PRICE_CLASS_ALL 
        : cloudfront.PriceClass.PRICE_CLASS_100,
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    // Tag the distribution
    cdk.Tags.of(distribution).add('Environment', environment);
    cdk.Tags.of(distribution).add('Project', 'MemberBenefitsLogin');
    cdk.Tags.of(distribution).add('Ticket', 'PM-103');

    return distribution;
  }

  /**
   * Creates CloudFormation outputs for important resource values
   */
  private createOutputs(): void {
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'S3 bucket name for static assets',
      exportName: `${this.stackName}-BucketName`,
    });

    new cdk.CfnOutput(this, 'BucketArn', {
      value: this.bucket.bucketArn,
      description: 'S3 bucket ARN',
      exportName: `${this.stackName}-BucketArn`,
    });

    new cdk.CfnOutput(this, 'LoginFunctionArn', {
      value: this.loginFunction.functionArn,
      description: 'Login Lambda function ARN',
      exportName: `${this.stackName}-LoginFunctionArn`,
    });

    new cdk.CfnOutput(this, 'LoginFunctionName', {
      value: this.loginFunction.functionName,
      description: 'Login Lambda function name',
      exportName: `${this.stackName}-LoginFunctionName`,
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
      exportName: `${this.stackName}-ApiEndpoint`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'API Gateway REST API ID',
      exportName: `${this.stackName}-ApiId`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `${this.stackName}-DistributionId`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
      exportName: `${this.stackName}-DistributionDomainName`,
    });

    new cdk.CfnOutput(this, 'LoginPageUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'Login page URL',
      exportName: `${this.stackName}-LoginPageUrl`,
    });
  }
}
```