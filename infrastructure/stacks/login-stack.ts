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
 * Props for LoginStack configuration
 */
export interface LoginStackProps extends cdk.StackProps {
  /**
   * Environment name (dev, staging, prod)
   */
  readonly environment: string;

  /**
   * Custom domain name for the login page (optional)
   */
  readonly domainName?: string;

  /**
   * Certificate ARN for custom domain (required if domainName is provided)
   */
  readonly certificateArn?: string;

  /**
   * Enable CloudFront logging
   * @default true
   */
  readonly enableLogging?: boolean;
}

/**
 * CDK Stack for Member Benefits Login Page Infrastructure
 * 
 * This stack provisions:
 * - S3 bucket for static assets (login page)
 * - Lambda functions for authentication logic
 * - API Gateway for backend endpoints
 * - CloudFront distribution for content delivery with proper routing
 * 
 * @ticket PM-105
 */
export class LoginStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution;
  public readonly api: apigateway.RestApi;
  public readonly staticBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: LoginStackProps) {
    super(scope, id, props);

    // S3 Bucket for static assets
    this.staticBucket = this.createStaticBucket(props.environment);

    // Lambda functions
    const authLambda = this.createAuthLambda(props.environment);
    const validateLambda = this.createValidateLambda(props.environment);

    // API Gateway
    this.api = this.createApiGateway(props.environment, authLambda, validateLambda);

    // CloudFront Distribution
    this.distribution = this.createCloudFrontDistribution(
      props.environment,
      props.domainName,
      props.certificateArn,
      props.enableLogging ?? true
    );

    // Deploy static assets
    this.deployStaticAssets();

    // Stack outputs
    this.createOutputs(props.environment);
  }

  /**
   * Creates S3 bucket for hosting static login page assets
   * 
   * @param environment - Environment name
   * @returns S3 Bucket instance
   */
  private createStaticBucket(environment: string): s3.Bucket {
    const bucket = new s3.Bucket(this, 'LoginStaticBucket', {
      bucketName: `member-benefits-login-${environment}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
      versioned: environment === 'prod',
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          enabled: true,
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    cdk.Tags.of(bucket).add('Environment', environment);
    cdk.Tags.of(bucket).add('Purpose', 'LoginPageStatic');

    return bucket;
  }

  /**
   * Creates Lambda function for authentication logic
   * 
   * @param environment - Environment name
   * @returns Lambda Function instance
   */
  private createAuthLambda(environment: string): lambda.Function {
    const authFunction = new lambda.Function(this, 'AuthFunction', {
      functionName: `member-benefits-auth-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/auth')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: environment,
        LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
      description: 'Handles member authentication for login page',
    });

    cdk.Tags.of(authFunction).add('Environment', environment);
    cdk.Tags.of(authFunction).add('Purpose', 'Authentication');

    return authFunction;
  }

  /**
   * Creates Lambda function for token validation
   * 
   * @param environment - Environment name
   * @returns Lambda Function instance
   */
  private createValidateLambda(environment: string): lambda.Function {
    const validateFunction = new lambda.Function(this, 'ValidateFunction', {
      functionName: `member-benefits-validate-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/validate')),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        ENVIRONMENT: environment,
        LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
      description: 'Validates authentication tokens',
    });

    cdk.Tags.of(validateFunction).add('Environment', environment);
    cdk.Tags.of(validateFunction).add('Purpose', 'TokenValidation');

    return validateFunction;
  }

  /**
   * Creates API Gateway with Lambda integrations
   * 
   * @param environment - Environment name
   * @param authLambda - Authentication Lambda function
   * @param validateLambda - Validation Lambda function
   * @returns REST API instance
   */
  private createApiGateway(
    environment: string,
    authLambda: lambda.Function,
    validateLambda: lambda.Function
  ): apigateway.RestApi {
    const api = new apigateway.RestApi(this, 'LoginApi', {
      restApiName: `member-benefits-login-api-${environment}`,
      description: 'API for member benefits login functionality',
      deployOptions: {
        stageName: environment,
        tracingEnabled: true,
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
      cloudWatchRole: true,
    });

    // Auth endpoint
    const authResource = api.root.addResource('auth');
    const loginResource = authResource.addResource('login');
    loginResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(authLambda, {
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

    // Validate endpoint
    const validateResource = authResource.addResource('validate');
    validateResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(validateLambda, {
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

    // Health check endpoint
    const healthResource = api.root.addResource('health');
    healthResource.addMethod(
      'GET',
      new apigateway.MockIntegration({
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': '{"status": "healthy"}',
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

    cdk.Tags.of(api).add('Environment', environment);
    cdk.Tags.of(api).add('Purpose', 'LoginAPI');

    return api;
  }

  /**
   * Creates CloudFront distribution with proper routing
   * 
   * @param environment - Environment name
   * @param domainName - Custom domain name (optional)
   * @param certificateArn - Certificate ARN (optional)
   * @param enableLogging - Enable CloudFront logging
   * @returns CloudFront Distribution instance
   */
  private createCloudFrontDistribution(
    environment: string,
    domainName?: string,
    certificateArn?: string,
    enableLogging: boolean = true
  ): cloudfront.Distribution {
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'LoginOAI',
      {
        comment: `OAI for member benefits login ${environment}`,
      }
    );

    this.staticBucket.grantRead(originAccessIdentity);

    const s3Origin = new origins.S3Origin(this.staticBucket, {
      originAccessIdentity,
    });

    const apiOrigin = new origins.RestApiOrigin(this.api);

    const cachePolicy = new cloudfront.CachePolicy(this, 'LoginCachePolicy', {
      cachePolicyName: `member-benefits-login-cache-${environment}`,
      comment: 'Cache policy for login page static assets',
      defaultTtl: cdk.Duration.hours(24),
      minTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.days(365),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    const apiCachePolicy = new cloudfront.CachePolicy(this, 'ApiCachePolicy', {
      cachePolicyName: `member-benefits-api-cache-${environment}`,
      comment: 'Cache policy for API endpoints',
      defaultTtl: cdk.Duration.seconds(0),
      minTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(1),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'Authorization',
        'Content-Type'
      ),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: cloudfront.CacheCookieBehavior.all(),
    });

    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      'SecurityHeadersPolicy',
      {
        responseHeadersPolicyName: `member-benefits-security-${environment}`,
        comment: 'Security headers for login page',
        securityHeadersBehavior: {
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
          strictTransportSecurity: {
            accessControlMaxAge: cdk.Duration.seconds(31536000),
            includeSubdomains: true,
            override: true,
          },
          xssProtection: {
            protection: true,
            modeBlock: true,
            override: true,
          },
        },
        customHeadersBehavior: {
          customHeaders: [
            {
              header: 'Cache-Control',
              value: 'no-cache, no-store, must-revalidate',
              override: false,
            },
          ],
        },
      }
    );

    const distributionProps: cloudfront.DistributionProps = {
      comment: `Member Benefits Login Distribution - ${environment}`,
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy,
        responseHeadersPolicy,
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: apiCachePolicy,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          compress: true,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enableLogging,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    };

    if (domainName && certificateArn) {
      const certificate = certificatemanager.Certificate.fromCertificateArn(
        this,
        'Certificate',
        certificateArn