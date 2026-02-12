import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
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
   * Whether to enable CORS for the API Gateway
   */
  readonly enableCors?: boolean;
  
  /**
   * Custom domain name for the CloudFront distribution
   */
  readonly domainName?: string;
}

/**
 * CDK Stack for deploying the Member Benefits Login Page infrastructure
 * 
 * This stack creates:
 * - S3 bucket for static assets (HTML, CSS, JS)
 * - CloudFront distribution for content delivery
 * - Lambda function for authentication logic
 * - API Gateway endpoint for login API
 * 
 * @class LoginPageStack
 * @extends {cdk.Stack}
 */
export class LoginPageStack extends cdk.Stack {
  public readonly staticAssetsBucket: s3.Bucket;
  public readonly loginFunction: lambda.Function;
  public readonly api: apigateway.RestApi;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: LoginPageStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const enableCors = props?.enableCors ?? true;

    // Create S3 bucket for static assets
    this.staticAssetsBucket = this.createStaticAssetsBucket(environment);

    // Create CloudFront distribution for static content
    this.distribution = this.createCloudFrontDistribution(this.staticAssetsBucket);

    // Create Lambda function for login authentication
    this.loginFunction = this.createLoginFunction(environment);

    // Create API Gateway
    this.api = this.createApiGateway(this.loginFunction, enableCors, environment);

    // Deploy static assets
    this.deployStaticAssets(this.staticAssetsBucket);

    // Output important values
    this.createOutputs();
  }

  /**
   * Creates an S3 bucket for hosting static assets
   * 
   * @param {string} environment - The environment name
   * @returns {s3.Bucket} The created S3 bucket
   */
  private createStaticAssetsBucket(environment: string): s3.Bucket {
    const bucket = new s3.Bucket(this, 'LoginPageStaticAssets', {
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
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
    });

    cdk.Tags.of(bucket).add('Project', 'MemberBenefits');
    cdk.Tags.of(bucket).add('Component', 'LoginPage');
    cdk.Tags.of(bucket).add('Environment', environment);

    return bucket;
  }

  /**
   * Creates a CloudFront distribution for the static assets bucket
   * 
   * @param {s3.Bucket} bucket - The S3 bucket containing static assets
   * @returns {cloudfront.Distribution} The created CloudFront distribution
   */
  private createCloudFrontDistribution(bucket: s3.Bucket): cloudfront.Distribution {
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'LoginPageOAI',
      {
        comment: 'OAI for Member Benefits Login Page',
      }
    );

    bucket.grantRead(originAccessIdentity);

    const distribution = new cloudfront.Distribution(this, 'LoginPageDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(bucket, {
          originAccessIdentity,
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
      comment: 'Member Benefits Login Page Distribution',
    });

    return distribution;
  }

  /**
   * Creates the Lambda function for login authentication
   * 
   * @param {string} environment - The environment name
   * @returns {lambda.Function} The created Lambda function
   */
  private createLoginFunction(environment: string): lambda.Function {
    const loginFunction = new lambda.Function(this, 'LoginFunction', {
      functionName: `member-benefits-login-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/login')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: environment,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
        LOG_LEVEL: environment === 'prod' ? 'info' : 'debug',
      },
      tracing: lambda.Tracing.ACTIVE,
      description: 'Lambda function for member benefits login authentication',
    });

    // Grant necessary permissions
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
    cdk.Tags.of(loginFunction).add('Environment', environment);

    return loginFunction;
  }

  /**
   * Creates the API Gateway REST API
   * 
   * @param {lambda.Function} loginFunction - The Lambda function to integrate
   * @param {boolean} enableCors - Whether to enable CORS
   * @param {string} environment - The environment name
   * @returns {apigateway.RestApi} The created API Gateway
   */
  private createApiGateway(
    loginFunction: lambda.Function,
    enableCors: boolean,
    environment: string
  ): apigateway.RestApi {
    const api = new apigateway.RestApi(this, 'LoginPageApi', {
      restApiName: `member-benefits-login-api-${environment}`,
      description: 'API Gateway for Member Benefits Login Page',
      deployOptions: {
        stageName: environment,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: environment !== 'prod',
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: enableCors
        ? {
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
          }
        : undefined,
      cloudWatchRole: true,
    });

    // Create Lambda integration
    const loginIntegration = new apigateway.LambdaIntegration(loginFunction, {
      proxy: true,
      allowTestInvoke: environment !== 'prod',
    });

    // Create /auth resource
    const authResource = api.root.addResource('auth');

    // Create /auth/login endpoint
    const loginResource = authResource.addResource('login');
    loginResource.addMethod('POST', loginIntegration, {
      apiKeyRequired: false,
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Create /auth/validate endpoint for token validation
    const validateResource = authResource.addResource('validate');
    validateResource.addMethod('POST', loginIntegration, {
      apiKeyRequired: false,
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Create /health endpoint
    const healthResource = api.root.addResource('health');
    healthResource.addMethod('GET', loginIntegration, {
      apiKeyRequired: false,
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    cdk.Tags.of(api).add('Project', 'MemberBenefits');
    cdk.Tags.of(api).add('Component', 'LoginPage');
    cdk.Tags.of(api).add('Environment', environment);

    return api;
  }

  /**
   * Deploys static assets to the S3 bucket
   * 
   * @param {s3.Bucket} bucket - The S3 bucket to deploy to
   */
  private deployStaticAssets(bucket: s3.Bucket): void {
    const staticAssetsPath = path.join(__dirname, '../static');

    new s3deploy.BucketDeployment(this, 'DeployLoginPageAssets', {
      sources: [s3deploy.Source.asset(staticAssetsPath)],
      destinationBucket: bucket,
      distribution: this.distribution,
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
   * Creates CloudFormation outputs for important stack values
   */
  private createOutputs(): void {
    new cdk.CfnOutput(this, 'StaticAssetsBucketName', {
      value: this.staticAssetsBucket.bucketName,
      description: 'S3 bucket name for static assets',
      exportName: `${this.stackName}-StaticAssetsBucket`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `${this.stackName}-DistributionId`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
      exportName: `${this.stackName}-DistributionDomain`,
    });

    new cdk.CfnOutput(this, 'LoginPageUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'Login page URL',
      exportName: `${this.stackName}-LoginPageUrl`,
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
      exportName: `${this.stackName}-ApiUrl`,
    });

    new cdk.CfnOutput(this, 'LoginFunctionArn', {
      value: this.loginFunction.functionArn,
      description: 'Login Lambda function ARN',
      exportName: `${this.stackName}-LoginFunctionArn`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'API Gateway REST API ID',
      exportName: `${this.stackName}-ApiId`,
    });
  }
}
```