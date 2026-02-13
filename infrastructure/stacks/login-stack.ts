import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import * as path from 'path';

/**
 * Properties for the LoginStack
 */
export interface LoginStackProps extends cdk.StackProps {
  /**
   * Environment name (e.g., 'dev', 'staging', 'prod')
   */
  readonly environment: string;

  /**
   * Custom domain name for the login page (optional)
   */
  readonly domainName?: string;

  /**
   * ACM certificate ARN for custom domain (required if domainName is provided)
   */
  readonly certificateArn?: string;

  /**
   * Enable CloudFront access logging
   * @default true
   */
  readonly enableAccessLogging?: boolean;

  /**
   * Lambda function memory size in MB
   * @default 512
   */
  readonly lambdaMemorySize?: number;

  /**
   * Lambda function timeout in seconds
   * @default 30
   */
  readonly lambdaTimeout?: number;
}

/**
 * CDK Stack for Login Page Infrastructure
 * 
 * This stack provisions:
 * - S3 bucket for static assets
 * - Lambda functions for authentication logic
 * - API Gateway for REST endpoints
 * - CloudFront distribution for content delivery
 * - Proper routing and caching configurations
 */
export class LoginStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution;
  public readonly api: apigateway.RestApi;
  public readonly staticAssetsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: LoginStackProps) {
    super(scope, id, props);

    const {
      environment,
      domainName,
      certificateArn,
      enableAccessLogging = true,
      lambdaMemorySize = 512,
      lambdaTimeout = 30,
    } = props;

    // S3 Bucket for static assets (HTML, CSS, JS, images)
    this.staticAssetsBucket = new s3.Bucket(this, 'LoginStaticAssets', {
      bucketName: `login-static-assets-${environment}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
      versioned: true,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          enabled: true,
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    // Lambda function for authentication
    const authFunction = new lambda.Function(this, 'AuthFunction', {
      functionName: `login-auth-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/auth')),
      memorySize: lambdaMemorySize,
      timeout: cdk.Duration.seconds(lambdaTimeout),
      environment: {
        ENVIRONMENT: environment,
        LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Lambda function for session validation
    const sessionValidationFunction = new lambda.Function(this, 'SessionValidationFunction', {
      functionName: `login-session-validation-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/session-validation')),
      memorySize: lambdaMemorySize,
      timeout: cdk.Duration.seconds(lambdaTimeout),
      environment: {
        ENVIRONMENT: environment,
        LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Lambda function for password reset
    const passwordResetFunction = new lambda.Function(this, 'PasswordResetFunction', {
      functionName: `login-password-reset-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/password-reset')),
      memorySize: lambdaMemorySize,
      timeout: cdk.Duration.seconds(lambdaTimeout),
      environment: {
        ENVIRONMENT: environment,
        LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
    });

    // API Gateway REST API
    this.api = new apigateway.RestApi(this, 'LoginApi', {
      restApiName: `login-api-${environment}`,
      description: 'API Gateway for member benefits login page',
      deployOptions: {
        stageName: environment,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: environment !== 'prod',
        metricsEnabled: true,
        throttlingBurstLimit: 1000,
        throttlingRateLimit: 500,
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
      cloudWatchRole: true,
    });

    // API Gateway resources and methods
    const authResource = this.api.root.addResource('auth');
    const loginResource = authResource.addResource('login');
    const sessionResource = authResource.addResource('session');
    const passwordResetResource = authResource.addResource('password-reset');

    // POST /auth/login
    loginResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(authFunction, {
        proxy: true,
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': "'*'",
            },
          },
        ],
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
            },
          },
        ],
      }
    );

    // GET /auth/session
    sessionResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(sessionValidationFunction, {
        proxy: true,
      })
    );

    // POST /auth/password-reset
    passwordResetResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(passwordResetFunction, {
        proxy: true,
      })
    );

    // S3 bucket for CloudFront access logs (if enabled)
    let logsBucket: s3.Bucket | undefined;
    if (enableAccessLogging) {
      logsBucket = new s3.Bucket(this, 'CloudFrontLogsBucket', {
        bucketName: `login-cloudfront-logs-${environment}-${this.account}`,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: environment !== 'prod',
        lifecycleRules: [
          {
            id: 'DeleteOldLogs',
            enabled: true,
            expiration: cdk.Duration.days(90),
          },
        ],
      });
    }

    // Origin Access Identity for S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI for login page ${environment}`,
    });

    this.staticAssetsBucket.grantRead(originAccessIdentity);

    // CloudFront cache policies
    const staticAssetsCachePolicy = new cloudfront.CachePolicy(this, 'StaticAssetsCachePolicy', {
      cachePolicyName: `login-static-assets-${environment}`,
      comment: 'Cache policy for static assets',
      defaultTtl: cdk.Duration.days(7),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.seconds(0),
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const apiCachePolicy = new cloudfront.CachePolicy(this, 'ApiCachePolicy', {
      cachePolicyName: `login-api-${environment}`,
      comment: 'Cache policy for API endpoints',
      defaultTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(1),
      minTtl: cdk.Duration.seconds(0),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'Authorization',
        'Content-Type',
        'Accept'
      ),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: cloudfront.CacheCookieBehavior.all(),
    });

    // CloudFront distribution configuration
    const distributionProps: cloudfront.DistributionProps = {
      comment: `Login page distribution for ${environment}`,
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enableIpv6: true,
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultBehavior: {
        origin: new origins.S3Origin(this.staticAssetsBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: staticAssetsCachePolicy,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.RestApiOrigin(this.api),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          cachePolicy: apiCachePolicy,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
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
    };

    // Add custom domain and certificate if provided
    if (domainName && certificateArn) {
      const certificate = certificatemanager.Certificate.fromCertificateArn(
        this,
        'Certificate',
        certificateArn
      );
      distributionProps.domainNames = [domainName];
      distributionProps.certificate = certificate;
    }

    // Add access logging if enabled
    if (enableAccessLogging && logsBucket) {
      distributionProps.enableLogging = true;
      distributionProps.logBucket = logsBucket;
      distributionProps.logFilePrefix = 'cloudfront-logs/';
      distributionProps.logIncludesCookies = true;
    }

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'LoginDistribution', distributionProps);

    // Deploy static assets to S3
    new s3deploy.BucketDeployment(this, 'DeployStaticAssets', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../public'))],
      destinationBucket: this.staticAssetsBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
      prune: true,
      retainOnDelete: environment === 'prod',
    });

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: `${environment}-login-distribution-id`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
      exportName: `${environment}-login-distribution-domain`,
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
      exportName: `${environment}-login-api-url`,
    });

    new cdk.CfnOutput(this, 'StaticAssetsBucketName', {
      value: this.staticAssetsBucket.bucketName,
      description: 'S3 Bucket for static assets',
      exportName: `${environment}-login-static-assets-bucket`,
    });

    if (domainName) {
      new cdk.CfnOutput(this, 'CustomDomainName', {
        value: domainName,
        description: 'Custom domain name for login page',
        exportName: `${environment}-login-custom-domain`,
      });
    }

    // Tags
    cdk.Tags.of(