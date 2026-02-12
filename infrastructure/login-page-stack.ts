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
   * Environment name (dev, staging, prod)
   */
  readonly environment?: string;
  
  /**
   * Whether to enable CloudFront distribution for static assets
   */
  readonly enableCloudFront?: boolean;
  
  /**
   * Custom domain name for the login page
   */
  readonly domainName?: string;
}

/**
 * CDK Stack for deploying the member benefits login page infrastructure
 * 
 * This stack creates:
 * - Lambda function for handling login authentication
 * - API Gateway REST API endpoint
 * - S3 bucket for static assets (HTML, CSS, JS)
 * - CloudFront distribution (optional) for CDN delivery
 * 
 * @ticket PM-92
 */
export class LoginPageStack extends cdk.Stack {
  public readonly loginApi: apigateway.RestApi;
  public readonly loginFunction: lambda.Function;
  public readonly staticAssetsBucket: s3.Bucket;
  public readonly distribution?: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: LoginPageStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const enableCloudFront = props?.enableCloudFront ?? true;

    // Create S3 bucket for static assets
    this.staticAssetsBucket = this.createStaticAssetsBucket(environment);

    // Create Lambda function for login authentication
    this.loginFunction = this.createLoginFunction(environment);

    // Create API Gateway
    this.loginApi = this.createApiGateway(environment);

    // Create CloudFront distribution if enabled
    if (enableCloudFront) {
      this.distribution = this.createCloudFrontDistribution(environment);
    }

    // Deploy static assets to S3
    this.deployStaticAssets();

    // Output important values
    this.createOutputs();
  }

  /**
   * Creates an S3 bucket for hosting static assets
   * 
   * @param environment - The deployment environment
   * @returns The created S3 bucket
   */
  private createStaticAssetsBucket(environment: string): s3.Bucket {
    const bucket = new s3.Bucket(this, 'LoginPageStaticAssets', {
      bucketName: `member-benefits-login-${environment}-${this.account}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
    });

    // Add bucket policy for CloudFront access
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [bucket.arnForObjects('*')],
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
      })
    );

    cdk.Tags.of(bucket).add('Environment', environment);
    cdk.Tags.of(bucket).add('Project', 'MemberBenefitsLogin');
    cdk.Tags.of(bucket).add('Ticket', 'PM-92');

    return bucket;
  }

  /**
   * Creates the Lambda function for handling login requests
   * 
   * @param environment - The deployment environment
   * @returns The created Lambda function
   */
  private createLoginFunction(environment: string): lambda.Function {
    const loginFunction = new lambda.Function(this, 'LoginFunction', {
      functionName: `member-benefits-login-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/login')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: environment,
        STATIC_ASSETS_BUCKET: this.staticAssetsBucket.bucketName,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
      },
      tracing: lambda.Tracing.ACTIVE,
      logRetention: environment === 'prod' ? 90 : 7,
      description: 'Lambda function for member benefits login authentication (PM-92)',
    });

    // Grant read access to static assets bucket
    this.staticAssetsBucket.grantRead(loginFunction);

    cdk.Tags.of(loginFunction).add('Environment', environment);
    cdk.Tags.of(loginFunction).add('Project', 'MemberBenefitsLogin');
    cdk.Tags.of(loginFunction).add('Ticket', 'PM-92');

    return loginFunction;
  }

  /**
   * Creates the API Gateway REST API
   * 
   * @param environment - The deployment environment
   * @returns The created REST API
   */
  private createApiGateway(environment: string): apigateway.RestApi {
    const api = new apigateway.RestApi(this, 'LoginApi', {
      restApiName: `member-benefits-login-api-${environment}`,
      description: 'API Gateway for member benefits login page (PM-92)',
      deployOptions: {
        stageName: environment,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: environment !== 'prod',
        metricsEnabled: true,
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
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
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
    });

    // Create Lambda integration
    const loginIntegration = new apigateway.LambdaIntegration(this.loginFunction, {
      proxy: true,
      allowTestInvoke: environment !== 'prod',
    });

    // Create /login resource
    const loginResource = api.root.addResource('login');
    
    // POST /login - Handle login submission
    loginResource.addMethod('POST', loginIntegration, {
      apiKeyRequired: false,
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // GET /login - Serve login page
    loginResource.addMethod('GET', loginIntegration, {
      apiKeyRequired: false,
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Create /health resource for health checks
    const healthResource = api.root.addResource('health');
    healthResource.addMethod('GET', loginIntegration);

    cdk.Tags.of(api).add('Environment', environment);
    cdk.Tags.of(api).add('Project', 'MemberBenefitsLogin');
    cdk.Tags.of(api).add('Ticket', 'PM-92');

    return api;
  }

  /**
   * Creates a CloudFront distribution for the static assets
   * 
   * @param environment - The deployment environment
   * @returns The created CloudFront distribution
   */
  private createCloudFrontDistribution(environment: string): cloudfront.Distribution {
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'LoginPageOAI',
      {
        comment: `OAI for member benefits login page ${environment}`,
      }
    );

    this.staticAssetsBucket.grantRead(originAccessIdentity);

    const distribution = new cloudfront.Distribution(this, 'LoginPageDistribution', {
      comment: `Member benefits login page distribution - ${environment} (PM-92)`,
      defaultBehavior: {
        origin: new origins.S3Origin(this.staticAssetsBucket, {
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
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });

    cdk.Tags.of(distribution).add('Environment', environment);
    cdk.Tags.of(distribution).add('Project', 'MemberBenefitsLogin');
    cdk.Tags.of(distribution).add('Ticket', 'PM-92');

    return distribution;
  }

  /**
   * Deploys static assets to the S3 bucket
   */
  private deployStaticAssets(): void {
    const staticAssetsPath = path.join(__dirname, '../../public/login');

    new s3deploy.BucketDeployment(this, 'DeployLoginPageAssets', {
      sources: [s3deploy.Source.asset(staticAssetsPath)],
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
      value: this.loginApi.url,
      description: 'API Gateway endpoint URL',
      exportName: `LoginApiEndpoint-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'LoginFunctionArn', {
      value: this.loginFunction.functionArn,
      description: 'Login Lambda function ARN',
      exportName: `LoginFunctionArn-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'StaticAssetsBucketName', {
      value: this.staticAssetsBucket.bucketName,
      description: 'S3 bucket name for static assets',
      exportName: `StaticAssetsBucket-${this.stackName}`,
    });

    if (this.distribution) {
      new cdk.CfnOutput(this, 'CloudFrontUrl', {
        value: `https://${this.distribution.distributionDomainName}`,
        description: 'CloudFront distribution URL',
        exportName: `CloudFrontUrl-${this.stackName}`,
      });

      new cdk.CfnOutput(this, 'DistributionId', {
        value: this.distribution.distributionId,
        description: 'CloudFront distribution ID',
        exportName: `DistributionId-${this.stackName}`,
      });
    }
  }
}