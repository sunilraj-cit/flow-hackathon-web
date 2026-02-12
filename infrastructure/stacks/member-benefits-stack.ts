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
   * Enable CloudFront distribution
   */
  readonly enableCloudFront?: boolean;
  
  /**
   * Custom domain name for CloudFront
   */
  readonly domainName?: string;
}

/**
 * Stack for Member Benefits infrastructure including login page
 * Provisions API Gateway, Lambda functions, and optional CloudFront distribution
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly loginPageFunction: lambda.Function;
  public readonly distribution?: cloudfront.Distribution;
  public readonly staticAssetsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const enableCloudFront = props?.enableCloudFront ?? true;

    // Create S3 bucket for static assets
    this.staticAssetsBucket = new s3.Bucket(this, 'StaticAssetsBucket', {
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
          maxAge: 3600,
        },
      ],
    });

    // Lambda function for serving login page
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
        NODE_ENV: 'production',
      },
      description: 'Lambda function to serve member benefits login page',
    });

    // Grant read access to static assets bucket
    this.staticAssetsBucket.grantRead(this.loginPageFunction);

    // Create API Gateway REST API
    this.api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `member-benefits-api-${environment}`,
      description: 'API Gateway for Member Benefits services',
      deployOptions: {
        stageName: environment,
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
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

    // Create Lambda integration
    const loginPageIntegration = new apigateway.LambdaIntegration(
      this.loginPageFunction,
      {
        proxy: true,
        allowTestInvoke: true,
        timeout: cdk.Duration.seconds(29),
      }
    );

    // Add /login resource
    const loginResource = this.api.root.addResource('login');
    loginResource.addMethod('GET', loginPageIntegration, {
      apiKeyRequired: false,
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Add /member-benefits resource for future endpoints
    const memberBenefitsResource = this.api.root.addResource('member-benefits');
    const memberBenefitsLoginResource = memberBenefitsResource.addResource('login');
    memberBenefitsLoginResource.addMethod('GET', loginPageIntegration, {
      apiKeyRequired: false,
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Add health check endpoint
    const healthResource = this.api.root.addResource('health');
    healthResource.addMethod('GET', loginPageIntegration, {
      apiKeyRequired: false,
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Configure CloudFront distribution if enabled
    if (enableCloudFront) {
      // Origin Access Identity for S3
      const originAccessIdentity = new cloudfront.OriginAccessIdentity(
        this,
        'OAI',
        {
          comment: `OAI for member benefits ${environment}`,
        }
      );

      // Grant read permissions to CloudFront
      this.staticAssetsBucket.grantRead(originAccessIdentity);

      // Cache policy for static assets
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

      // Cache policy for API responses
      const apiCachePolicy = new cloudfront.CachePolicy(
        this,
        'ApiCachePolicy',
        {
          cachePolicyName: `member-benefits-api-${environment}`,
          comment: 'Cache policy for API Gateway',
          defaultTtl: cdk.Duration.seconds(0),
          maxTtl: cdk.Duration.days(1),
          minTtl: cdk.Duration.seconds(0),
          enableAcceptEncodingGzip: true,
          enableAcceptEncodingBrotli: true,
          headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
            'Authorization',
            'Content-Type'
          ),
          queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
          cookieBehavior: cloudfront.CacheCookieBehavior.all(),
        }
      );

      // Create CloudFront distribution
      this.distribution = new cloudfront.Distribution(
        this,
        'MemberBenefitsDistribution',
        {
          comment: `Member Benefits Distribution - ${environment}`,
          defaultBehavior: {
            origin: new origins.RestApiOrigin(this.api, {
              originPath: `/${environment}`,
            }),
            viewerProtocolPolicy:
              cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
            cachePolicy: apiCachePolicy,
            compress: true,
          },
          additionalBehaviors: {
            '/static/*': {
              origin: new origins.S3Origin(this.staticAssetsBucket, {
                originAccessIdentity: originAccessIdentity,
              }),
              viewerProtocolPolicy:
                cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
              allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
              cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
              cachePolicy: staticAssetsCachePolicy,
              compress: true,
            },
          },
          priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
          enabled: true,
          httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
          minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        }
      );

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

    // Stack outputs
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
      exportName: `member-benefits-api-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginPageUrl', {
      value: `${this.api.url}login`,
      description: 'Login page URL',
      exportName: `member-benefits-login-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginFunctionArn', {
      value: this.loginPageFunction.functionArn,
      description: 'Login page Lambda function ARN',
      exportName: `member-benefits-login-function-arn-${environment}`,
    });

    new cdk.CfnOutput(this, 'StaticAssetsBucketName', {
      value: this.staticAssetsBucket.bucketName,
      description: 'S3 bucket for static assets',
      exportName: `member-benefits-static-bucket-${environment}`,
    });

    // Add tags
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Component', 'LoginPage');
  }
}
```