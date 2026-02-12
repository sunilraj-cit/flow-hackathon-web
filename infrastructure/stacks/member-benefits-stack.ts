import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

/**
 * Props for MemberBenefitsStack
 */
export interface MemberBenefitsStackProps extends cdk.StackProps {
  /**
   * Environment name (dev, staging, prod)
   */
  readonly environment?: string;
  
  /**
   * Custom domain name for CloudFront distribution
   */
  readonly domainName?: string;
  
  /**
   * Whether to enable CloudFront distribution
   */
  readonly enableCloudFront?: boolean;
}

/**
 * CDK Stack for Member Benefits infrastructure
 * Provisions API Gateway, Lambda functions, and CloudFront distribution
 * for serving the member benefits login page
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly loginPageFunction: lambda.Function;
  public readonly distribution?: cloudfront.Distribution;
  public readonly staticAssetsBucket?: s3.Bucket;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const enableCloudFront = props?.enableCloudFront ?? true;

    // Create S3 bucket for static assets
    this.staticAssetsBucket = new s3.Bucket(this, 'MemberBenefitsStaticAssets', {
      bucketName: `member-benefits-static-${environment}-${this.account}`,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
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

    // Create Lambda function for serving login page
    this.loginPageFunction = new lambda.Function(this, 'LoginPageFunction', {
      functionName: `member-benefits-login-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/login-page')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: environment,
        STATIC_ASSETS_BUCKET: this.staticAssetsBucket.bucketName,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
      },
      description: 'Lambda function to serve member benefits login page',
    });

    // Grant Lambda read access to S3 bucket
    this.staticAssetsBucket.grantRead(this.loginPageFunction);

    // Create API Gateway REST API
    this.api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `member-benefits-api-${environment}`,
      description: 'API Gateway for Member Benefits application',
      deployOptions: {
        stageName: environment,
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
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
        maxAge: cdk.Duration.days(1),
      },
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
    });

    // Create Lambda integration
    const loginPageIntegration = new apigateway.LambdaIntegration(this.loginPageFunction, {
      proxy: true,
      allowTestInvoke: true,
      timeout: cdk.Duration.seconds(29),
    });

    // Add /login endpoint
    const loginResource = this.api.root.addResource('login');
    loginResource.addMethod('GET', loginPageIntegration, {
      apiKeyRequired: false,
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true,
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
        {
          statusCode: '400',
        },
        {
          statusCode: '500',
        },
      ],
    });

    // Add /member-benefits/login endpoint for nested routing
    const memberBenefitsResource = this.api.root.addResource('member-benefits');
    const nestedLoginResource = memberBenefitsResource.addResource('login');
    nestedLoginResource.addMethod('GET', loginPageIntegration, {
      apiKeyRequired: false,
    });

    // Create CloudFront distribution if enabled
    if (enableCloudFront) {
      // Create Origin Access Identity for S3
      const originAccessIdentity = new cloudfront.OriginAccessIdentity(
        this,
        'MemberBenefitsOAI',
        {
          comment: 'OAI for Member Benefits static assets',
        }
      );

      // Grant CloudFront read access to S3 bucket
      this.staticAssetsBucket.grantRead(originAccessIdentity);

      // Create cache policy for API responses
      const apiCachePolicy = new cloudfront.CachePolicy(this, 'ApiCachePolicy', {
        cachePolicyName: `member-benefits-api-cache-${environment}`,
        comment: 'Cache policy for Member Benefits API',
        defaultTtl: cdk.Duration.seconds(0),
        minTtl: cdk.Duration.seconds(0),
        maxTtl: cdk.Duration.seconds(1),
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          'Authorization',
          'CloudFront-Viewer-Country'
        ),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        cookieBehavior: cloudfront.CacheCookieBehavior.all(),
      });

      // Create cache policy for static assets
      const staticCachePolicy = new cloudfront.CachePolicy(this, 'StaticCachePolicy', {
        cachePolicyName: `member-benefits-static-cache-${environment}`,
        comment: 'Cache policy for static assets',
        defaultTtl: cdk.Duration.days(7),
        minTtl: cdk.Duration.days(1),
        maxTtl: cdk.Duration.days(365),
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
      });

      // Create CloudFront distribution
      this.distribution = new cloudfront.Distribution(this, 'MemberBenefitsDistribution', {
        comment: `Member Benefits CloudFront Distribution - ${environment}`,
        defaultBehavior: {
          origin: new origins.RestApiOrigin(this.api, {
            originPath: `/${environment}`,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          cachePolicy: apiCachePolicy,
          compress: true,
        },
        additionalBehaviors: {
          '/static/*': {
            origin: new origins.S3Origin(this.staticAssetsBucket, {
              originAccessIdentity,
            }),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
            cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
            cachePolicy: staticCachePolicy,
            compress: true,
          },
          '/assets/*': {
            origin: new origins.S3Origin(this.staticAssetsBucket, {
              originAccessIdentity,
            }),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
            cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
            cachePolicy: staticCachePolicy,
            compress: true,
          },
        },
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        enabled: true,
        httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 404,
            responsePagePath: '/login',
            ttl: cdk.Duration.seconds(10),
          },
          {
            httpStatus: 500,
            responseHttpStatus: 500,
            ttl: cdk.Duration.seconds(0),
          },
        ],
      });

      // Output CloudFront URL
      new cdk.CfnOutput(this, 'CloudFrontUrl', {
        value: `https://${this.distribution.distributionDomainName}`,
        description: 'CloudFront Distribution URL',
        exportName: `member-benefits-cloudfront-url-${environment}`,
      });

      new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
        value: this.distribution.distributionId,
        description: 'CloudFront Distribution ID',
        exportName: `member-benefits-cloudfront-id-${environment}`,
      });
    }

    // Output API Gateway URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
      exportName: `member-benefits-api-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginPageUrl', {
      value: `${this.api.url}login`,
      description: 'Login Page URL',
      exportName: `member-benefits-login-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'StaticAssetsBucket', {
      value: this.staticAssetsBucket.bucketName,
      description: 'S3 Bucket for static assets',
      exportName: `member-benefits-static-bucket-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginFunctionArn', {
      value: this.loginPageFunction.functionArn,
      description: 'Login Lambda Function ARN',
      exportName: `member-benefits-login-function-arn-${environment}`,
    });

    // Add tags for resource management
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Component', 'LoginPage');
  }
}
```