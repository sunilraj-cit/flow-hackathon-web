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
  readonly staticAssetsPath?: string;
  
  /**
   * Path to Lambda function code
   */
  readonly lambdaCodePath?: string;
}

/**
 * CDK Stack for deploying the member benefits login page infrastructure
 * 
 * This stack creates:
 * - S3 bucket for static assets
 * - CloudFront distribution for content delivery
 * - Lambda function for authentication logic
 * - API Gateway endpoint for Lambda integration
 * 
 * @class LoginPageStack
 * @extends {cdk.Stack}
 */
export class LoginPageStack extends cdk.Stack {
  public readonly staticAssetsBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly loginLambda: lambda.Function;
  public readonly api: apigateway.RestApi;
  public readonly apiUrl: cdk.CfnOutput;
  public readonly distributionUrl: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props?: LoginPageStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const staticAssetsPath = props?.staticAssetsPath || path.join(__dirname, '../../public');
    const lambdaCodePath = props?.lambdaCodePath || path.join(__dirname, '../lambda');

    // Create S3 bucket for static assets
    this.staticAssetsBucket = this.createStaticAssetsBucket(environment);

    // Create Lambda function for login authentication
    this.loginLambda = this.createLoginLambda(environment, lambdaCodePath);

    // Create API Gateway
    this.api = this.createApiGateway(environment);

    // Create CloudFront distribution
    this.distribution = this.createCloudFrontDistribution(environment);

    // Deploy static assets to S3
    this.deployStaticAssets(staticAssetsPath);

    // Create outputs
    this.apiUrl = new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL for login endpoint',
      exportName: `${environment}-login-api-url`,
    });

    this.distributionUrl = new cdk.CfnOutput(this, 'DistributionUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL',
      exportName: `${environment}-login-distribution-url`,
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: this.staticAssetsBucket.bucketName,
      description: 'S3 bucket name for static assets',
      exportName: `${environment}-login-bucket-name`,
    });
  }

  /**
   * Creates an S3 bucket for hosting static assets
   * 
   * @private
   * @param {string} environment - Environment name
   * @returns {s3.Bucket} The created S3 bucket
   */
  private createStaticAssetsBucket(environment: string): s3.Bucket {
    const bucket = new s3.Bucket(this, 'LoginPageStaticAssets', {
      bucketName: `member-benefits-login-${environment}-${this.account}`,
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
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
          enabled: true,
        },
      ],
    });

    cdk.Tags.of(bucket).add('Environment', environment);
    cdk.Tags.of(bucket).add('Project', 'MemberBenefitsLogin');
    cdk.Tags.of(bucket).add('ManagedBy', 'CDK');

    return bucket;
  }

  /**
   * Creates a Lambda function for login authentication
   * 
   * @private
   * @param {string} environment - Environment name
   * @param {string} codePath - Path to Lambda function code
   * @returns {lambda.Function} The created Lambda function
   */
  private createLoginLambda(environment: string, codePath: string): lambda.Function {
    const lambdaFunction = new lambda.Function(this, 'LoginFunction', {
      functionName: `member-benefits-login-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(codePath),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: environment,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
        LOG_LEVEL: environment === 'prod' ? 'info' : 'debug',
      },
      tracing: lambda.Tracing.ACTIVE,
      retryAttempts: 2,
      reservedConcurrentExecutions: environment === 'prod' ? 100 : 10,
    });

    // Add CloudWatch Logs permissions
    lambdaFunction.addToRolePolicy(
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

    cdk.Tags.of(lambdaFunction).add('Environment', environment);
    cdk.Tags.of(lambdaFunction).add('Project', 'MemberBenefitsLogin');
    cdk.Tags.of(lambdaFunction).add('ManagedBy', 'CDK');

    return lambdaFunction;
  }

  /**
   * Creates an API Gateway REST API with login endpoint
   * 
   * @private
   * @param {string} environment - Environment name
   * @returns {apigateway.RestApi} The created API Gateway
   */
  private createApiGateway(environment: string): apigateway.RestApi {
    const api = new apigateway.RestApi(this, 'LoginApi', {
      restApiName: `member-benefits-login-api-${environment}`,
      description: 'API Gateway for member benefits login page',
      deployOptions: {
        stageName: environment,
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: environment !== 'prod',
        metricsEnabled: true,
        tracingEnabled: true,
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

    // Create /login resource
    const loginResource = api.root.addResource('login');

    // Add POST method for login
    const loginIntegration = new apigateway.LambdaIntegration(this.loginLambda, {
      proxy: true,
      allowTestInvoke: true,
      timeout: cdk.Duration.seconds(29),
    });

    loginResource.addMethod('POST', loginIntegration, {
      apiKeyRequired: false,
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Add OPTIONS method for CORS
    loginResource.addMethod('OPTIONS', new apigateway.MockIntegration({
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
            'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,POST'",
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          },
        },
      ],
      passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    }), {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true,
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
      ],
    });

    cdk.Tags.of(api).add('Environment', environment);
    cdk.Tags.of(api).add('Project', 'MemberBenefitsLogin');
    cdk.Tags.of(api).add('ManagedBy', 'CDK');

    return api;
  }

  /**
   * Creates a CloudFront distribution for content delivery
   * 
   * @private
   * @param {string} environment - Environment name
   * @returns {cloudfront.Distribution} The created CloudFront distribution
   */
  private createCloudFrontDistribution(environment: string): cloudfront.Distribution {
    // Create Origin Access Identity for S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'LoginPageOAI',
      {
        comment: `OAI for member benefits login page ${environment}`,
      }
    );

    // Grant read permissions to CloudFront
    this.staticAssetsBucket.grantRead(originAccessIdentity);

    // Create cache policy
    const cachePolicy = new cloudfront.CachePolicy(this, 'LoginPageCachePolicy', {
      cachePolicyName: `member-benefits-login-cache-${environment}`,
      comment: 'Cache policy for login page static assets',
      defaultTtl: cdk.Duration.days(1),
      minTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.days(365),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // Create distribution
    const distribution = new cloudfront.Distribution(this, 'LoginPageDistribution', {
      comment: `CloudFront distribution for member benefits login page ${environment}`,
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new origins.S3Origin(this.staticAssetsBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy,
      },
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

    cdk.Tags.of(distribution).add('Environment', environment);
    cdk.Tags.of(distribution).add('Project', 'MemberBenefitsLogin');
    cdk.Tags.of(distribution).add('ManagedBy', 'CDK');

    return distribution;
  }

  /**
   * Deploys static assets to S3 bucket
   * 
   * @private
   * @param {string} assetsPath - Path to static assets directory
   */
  private deployStaticAssets(assetsPath: string): void {
    new s3deploy.BucketDeployment(this, 'DeployLoginPageAssets', {
      sources: [s3deploy.Source.asset(assetsPath)],
      destinationBucket: this.staticAssetsBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
      prune: true,
      retainOnDelete: false,
      memoryLimit: 512,
      ephemeralStorageSize: cdk.Size.mebibytes(512),
    });
  }
}
```