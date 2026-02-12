import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
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
 * CDK Stack for Member Benefits infrastructure
 * Includes Lambda functions, API Gateway, S3, and CloudFront distribution
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly loginLambda: lambda.Function;
  public readonly api: apigateway.RestApi;
  public readonly staticAssetsBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';

    // Create S3 bucket for static assets
    this.staticAssetsBucket = this.createStaticAssetsBucket(environment);

    // Create Lambda function for login
    this.loginLambda = this.createLoginLambda(environment);

    // Create API Gateway
    this.api = this.createApiGateway(environment);

    // Create CloudFront distribution
    this.distribution = this.createCloudFrontDistribution(environment);

    // Deploy static assets
    this.deployStaticAssets();

    // Output important values
    this.createOutputs();
  }

  /**
   * Creates S3 bucket for hosting static assets
   * @param environment - Environment name
   * @returns S3 Bucket instance
   */
  private createStaticAssetsBucket(environment: string): s3.Bucket {
    const bucket = new s3.Bucket(this, 'MemberBenefitsStaticAssets', {
      bucketName: `member-benefits-static-${environment}-${this.account}`,
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
          maxAge: 3000,
        },
      ],
    });

    return bucket;
  }

  /**
   * Creates Lambda function for login functionality
   * @param environment - Environment name
   * @returns Lambda Function instance
   */
  private createLoginLambda(environment: string): lambda.Function {
    const loginLambda = new lambda.Function(this, 'MemberBenefitsLoginLambda', {
      functionName: `member-benefits-login-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/login')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: environment,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
      },
      tracing: lambda.Tracing.ACTIVE,
      logRetention: environment === 'prod' ? 90 : 7,
    });

    // Add permissions for Lambda to write logs
    loginLambda.addToRolePolicy(
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

    return loginLambda;
  }

  /**
   * Creates API Gateway REST API with login endpoint
   * @param environment - Environment name
   * @returns RestApi instance
   */
  private createApiGateway(environment: string): apigateway.RestApi {
    const api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `member-benefits-api-${environment}`,
      description: 'API Gateway for Member Benefits',
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

    // Create /auth resource
    const authResource = api.root.addResource('auth');

    // Create /auth/login endpoint
    const loginResource = authResource.addResource('login');
    const loginIntegration = new apigateway.LambdaIntegration(this.loginLambda, {
      proxy: true,
      allowTestInvoke: true,
    });

    loginResource.addMethod('POST', loginIntegration, {
      apiKeyRequired: false,
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Add request validator
    const requestValidator = new apigateway.RequestValidator(
      this,
      'MemberBenefitsRequestValidator',
      {
        restApi: api,
        requestValidatorName: 'member-benefits-validator',
        validateRequestBody: true,
        validateRequestParameters: true,
      }
    );

    return api;
  }

  /**
   * Creates CloudFront distribution for static assets and API
   * @param environment - Environment name
   * @returns Distribution instance
   */
  private createCloudFrontDistribution(environment: string): cloudfront.Distribution {
    // Create Origin Access Identity for S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'MemberBenefitsOAI',
      {
        comment: `OAI for Member Benefits ${environment}`,
      }
    );

    // Grant read permissions to CloudFront
    this.staticAssetsBucket.grantRead(originAccessIdentity);

    // Create cache policies
    const staticAssetsCachePolicy = new cloudfront.CachePolicy(
      this,
      'StaticAssetsCachePolicy',
      {
        cachePolicyName: `member-benefits-static-${environment}`,
        comment: 'Cache policy for static assets',
        defaultTtl: cdk.Duration.days(7),
        maxTtl: cdk.Duration.days(365),
        minTtl: cdk.Duration.seconds(0),
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
        headerBehavior: cloudfront.CacheHeaderBehavior.none(),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      }
    );

    const apiCachePolicy = new cloudfront.CachePolicy(this, 'ApiCachePolicy', {
      cachePolicyName: `member-benefits-api-${environment}`,
      comment: 'Cache policy for API requests',
      defaultTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(1),
      minTtl: cdk.Duration.seconds(0),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'Authorization',
        'Content-Type'
      ),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: cloudfront.CacheCookieBehavior.all(),
    });

    // Create origin request policy for API
    const apiOriginRequestPolicy = new cloudfront.OriginRequestPolicy(
      this,
      'ApiOriginRequestPolicy',
      {
        originRequestPolicyName: `member-benefits-api-origin-${environment}`,
        comment: 'Origin request policy for API',
        headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
          'Authorization',
          'Content-Type',
          'Accept'
        ),
        queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
        cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
      }
    );

    // Create distribution
    const distribution = new cloudfront.Distribution(
      this,
      'MemberBenefitsDistribution',
      {
        comment: `Member Benefits Distribution - ${environment}`,
        defaultRootObject: 'index.html',
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        enableLogging: true,
        defaultBehavior: {
          origin: new origins.S3Origin(this.staticAssetsBucket, {
            originAccessIdentity,
          }),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
          cachePolicy: staticAssetsCachePolicy,
        },
        additionalBehaviors: {
          '/api/*': {
            origin: new origins.RestApiOrigin(this.api),
            viewerProtocolPolicy:
              cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
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
            ttl: cdk.Duration.seconds(0),
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.seconds(0),
          },
        ],
      }
    );

    return distribution;
  }

  /**
   * Deploys static assets to S3 bucket
   */
  private deployStaticAssets(): void {
    const publicPath = path.join(__dirname, '../../public');

    new s3deploy.BucketDeployment(this, 'DeployStaticAssets', {
      sources: [s3deploy.Source.asset(publicPath)],
      destinationBucket: this.staticAssetsBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
      prune: true,
      memoryLimit: 512,
    });
  }

  /**
   * Creates CloudFormation outputs for important resources
   */
  private createOutputs(): void {
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
      exportName: `MemberBenefitsApiEndpoint-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL',
      exportName: `MemberBenefitsCloudFrontUrl-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'StaticAssetsBucketName', {
      value: this.staticAssetsBucket.bucketName,
      description: 'S3 bucket name for static assets',
      exportName: `MemberBenefitsStaticBucket-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'LoginLambdaArn', {
      value: this.loginLambda.functionArn,
      description: 'Login Lambda function ARN',
      exportName: `MemberBenefitsLoginLambdaArn-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `MemberBenefitsDistributionId-${this.stackName}`,
    });
  }
}
```