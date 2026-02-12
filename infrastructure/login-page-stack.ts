import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
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
   * Custom domain name for CloudFront distribution
   */
  readonly domainName?: string;
  
  /**
   * Path to static assets directory
   */
  readonly assetsPath?: string;
  
  /**
   * Path to Lambda function code
   */
  readonly lambdaPath?: string;
}

/**
 * CDK Stack for Member Benefits Login Page
 * 
 * Creates infrastructure for a serverless login page including:
 * - S3 bucket for static assets
 * - CloudFront distribution for content delivery
 * - Lambda function for authentication logic
 * - API Gateway endpoint for REST API
 * 
 * @ticket PM-94
 */
export class LoginPageStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution;
  public readonly bucket: s3.Bucket;
  public readonly api: apigateway.RestApi;
  public readonly loginFunction: lambda.Function;

  constructor(scope: Construct, id: string, props?: LoginPageStackProps) {
    super(scope, id, props);

    const env = props?.environment || 'dev';
    const assetsPath = props?.assetsPath || path.join(__dirname, '../../public');
    const lambdaPath = props?.lambdaPath || path.join(__dirname, '../lambda');

    // Create S3 bucket for static assets
    this.bucket = this.createStaticAssetsBucket(env);

    // Create CloudFront Origin Access Identity
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'LoginPageOAI',
      {
        comment: `OAI for Member Benefits Login Page - ${env}`,
      }
    );

    // Grant CloudFront read access to S3 bucket
    this.bucket.grantRead(originAccessIdentity);

    // Create CloudFront distribution
    this.distribution = this.createCloudFrontDistribution(
      this.bucket,
      originAccessIdentity,
      env
    );

    // Deploy static assets to S3
    this.deployStaticAssets(this.bucket, assetsPath, this.distribution);

    // Create Lambda function for login authentication
    this.loginFunction = this.createLoginLambda(lambdaPath, env);

    // Create API Gateway
    this.api = this.createApiGateway(this.loginFunction, env);

    // Output important values
    this.createOutputs();
  }

  /**
   * Creates S3 bucket for hosting static assets
   * 
   * @param env - Environment name
   * @returns S3 Bucket instance
   */
  private createStaticAssetsBucket(env: string): s3.Bucket {
    const bucket = new s3.Bucket(this, 'LoginPageAssetsBucket', {
      bucketName: `member-benefits-login-assets-${env}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: env === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: env !== 'prod',
      versioned: env === 'prod',
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          enabled: true,
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
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

    cdk.Tags.of(bucket).add('Project', 'MemberBenefits');
    cdk.Tags.of(bucket).add('Component', 'LoginPage');
    cdk.Tags.of(bucket).add('Environment', env);

    return bucket;
  }

  /**
   * Creates CloudFront distribution for content delivery
   * 
   * @param bucket - S3 bucket containing static assets
   * @param oai - Origin Access Identity
   * @param env - Environment name
   * @returns CloudFront Distribution instance
   */
  private createCloudFrontDistribution(
    bucket: s3.Bucket,
    oai: cloudfront.OriginAccessIdentity,
    env: string
  ): cloudfront.Distribution {
    const distribution = new cloudfront.Distribution(this, 'LoginPageDistribution', {
      comment: `Member Benefits Login Page Distribution - ${env}`,
      defaultBehavior: {
        origin: new origins.S3Origin(bucket, {
          originAccessIdentity: oai,
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
      priceClass: env === 'prod' 
        ? cloudfront.PriceClass.PRICE_CLASS_ALL 
        : cloudfront.PriceClass.PRICE_CLASS_100,
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    cdk.Tags.of(distribution).add('Project', 'MemberBenefits');
    cdk.Tags.of(distribution).add('Component', 'LoginPage');
    cdk.Tags.of(distribution).add('Environment', env);

    return distribution;
  }

  /**
   * Deploys static assets to S3 bucket
   * 
   * @param bucket - Target S3 bucket
   * @param assetsPath - Path to static assets directory
   * @param distribution - CloudFront distribution to invalidate
   */
  private deployStaticAssets(
    bucket: s3.Bucket,
    assetsPath: string,
    distribution: cloudfront.Distribution
  ): void {
    new s3deploy.BucketDeployment(this, 'DeployLoginPageAssets', {
      sources: [s3deploy.Source.asset(assetsPath)],
      destinationBucket: bucket,
      distribution,
      distributionPaths: ['/*'],
      prune: true,
      memoryLimit: 512,
      cacheControl: [
        s3deploy.CacheControl.setPublic(),
        s3deploy.CacheControl.maxAge(cdk.Duration.days(30)),
      ],
    });
  }

  /**
   * Creates Lambda function for login authentication
   * 
   * @param lambdaPath - Path to Lambda function code
   * @param env - Environment name
   * @returns Lambda Function instance
   */
  private createLoginLambda(lambdaPath: string, env: string): lambda.Function {
    const loginFunction = new lambda.Function(this, 'LoginFunction', {
      functionName: `member-benefits-login-${env}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(lambdaPath),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        ENVIRONMENT: env,
        NODE_ENV: env === 'prod' ? 'production' : 'development',
        LOG_LEVEL: env === 'prod' ? 'info' : 'debug',
      },
      tracing: lambda.Tracing.ACTIVE,
      reservedConcurrentExecutions: env === 'prod' ? 100 : undefined,
      description: 'Lambda function for member benefits login authentication',
    });

    // Add CloudWatch Logs permissions
    loginFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: ['*'],
      })
    );

    cdk.Tags.of(loginFunction).add('Project', 'MemberBenefits');
    cdk.Tags.of(loginFunction).add('Component', 'LoginPage');
    cdk.Tags.of(loginFunction).add('Environment', env);

    return loginFunction;
  }

  /**
   * Creates API Gateway REST API
   * 
   * @param loginFunction - Lambda function to integrate
   * @param env - Environment name
   * @returns API Gateway RestApi instance
   */
  private createApiGateway(
    loginFunction: lambda.Function,
    env: string
  ): apigateway.RestApi {
    const api = new apigateway.RestApi(this, 'LoginPageApi', {
      restApiName: `member-benefits-login-api-${env}`,
      description: 'API Gateway for Member Benefits Login Page',
      deployOptions: {
        stageName: env,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: env !== 'prod',
        metricsEnabled: true,
        throttlingBurstLimit: 5000,
        throttlingRateLimit: 2000,
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
        maxAge: cdk.Duration.hours(1),
      },
      cloudWatchRole: true,
    });

    // Create Lambda integration
    const loginIntegration = new apigateway.LambdaIntegration(loginFunction, {
      proxy: true,
      allowTestInvoke: env !== 'prod',
    });

    // Create /login resource
    const loginResource = api.root.addResource('login');
    
    // Add POST method for login
    loginResource.addMethod('POST', loginIntegration, {
      apiKeyRequired: false,
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Create /auth resource for additional auth endpoints
    const authResource = api.root.addResource('auth');
    
    // Add POST method for token validation
    const validateResource = authResource.addResource('validate');
    validateResource.addMethod('POST', loginIntegration);

    // Add POST method for logout
    const logoutResource = authResource.addResource('logout');
    logoutResource.addMethod('POST', loginIntegration);

    cdk.Tags.of(api).add('Project', 'MemberBenefits');
    cdk.Tags.of(api).add('Component', 'LoginPage');
    cdk.Tags.of(api).add('Environment', env);

    return api;
  }

  /**
   * Creates CloudFormation outputs for important resources
   */
  private createOutputs(): void {
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'S3 bucket name for static assets',
      exportName: `LoginPageBucketName-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `LoginPageDistributionId-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
      exportName: `LoginPageDistributionDomain-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'CloudFront URL for login page',
      exportName: `LoginPageUrl-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
      exportName: `LoginPageApiEndpoint-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'API Gateway REST API ID',
      exportName: `LoginPageApiId-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: this.loginFunction.functionName,
      description: 'Lambda function name',
      exportName: `LoginPageLambdaName-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionArn', {
      value: this.loginFunction.functionArn,
      description: 'Lambda function ARN',
      exportName: `LoginPageLambdaArn-${this.stackName}`,
    });
  }
}