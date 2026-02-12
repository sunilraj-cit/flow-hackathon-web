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
   * Whether to enable CloudFront distribution
   */
  readonly enableCloudFront?: boolean;
  
  /**
   * Custom domain name for CloudFront (optional)
   */
  readonly domainName?: string;
}

/**
 * CDK Stack for Member Benefits Login Page Infrastructure
 * 
 * This stack provisions:
 * - Lambda function for serving the login page
 * - API Gateway REST API endpoint
 * - S3 bucket for static assets
 * - CloudFront distribution (optional)
 * 
 * @class MemberBenefitsStack
 * @extends {cdk.Stack}
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly loginPageFunction: lambda.Function;
  public readonly api: apigateway.RestApi;
  public readonly assetsBucket: s3.Bucket;
  public readonly distribution?: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const enableCloudFront = props?.enableCloudFront ?? true;

    // S3 Bucket for static assets (CSS, images, etc.)
    this.assetsBucket = new s3.Bucket(this, 'MemberBenefitsAssetsBucket', {
      bucketName: `member-benefits-assets-${environment}-${this.account}`,
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

    // Lambda function for serving the login page
    this.loginPageFunction = new lambda.Function(this, 'LoginPageFunction', {
      functionName: `member-benefits-login-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/login-page')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: environment,
        ASSETS_BUCKET: this.assetsBucket.bucketName,
        ASSETS_BUCKET_REGION: this.region,
      },
      description: 'Lambda function to serve member benefits login page',
    });

    // Grant Lambda read access to S3 bucket
    this.assetsBucket.grantRead(this.loginPageFunction);

    // API Gateway REST API
    this.api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `member-benefits-api-${environment}`,
      description: 'API Gateway for Member Benefits Login Page',
      deployOptions: {
        stageName: environment,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
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
      },
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
    });

    // Lambda integration
    const loginPageIntegration = new apigateway.LambdaIntegration(
      this.loginPageFunction,
      {
        proxy: true,
        allowTestInvoke: true,
        timeout: cdk.Duration.seconds(29),
      }
    );

    // API Gateway resources and methods
    const loginResource = this.api.root.addResource('login');
    loginResource.addMethod('GET', loginPageIntegration, {
      apiKeyRequired: false,
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Add POST method for login form submission
    loginResource.addMethod('POST', loginPageIntegration, {
      apiKeyRequired: false,
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Add assets proxy resource for serving static files
    const assetsResource = this.api.root.addResource('assets');
    const assetsProxyResource = assetsResource.addResource('{proxy+}');
    assetsProxyResource.addMethod('GET', loginPageIntegration);

    // CloudFront Distribution (optional)
    if (enableCloudFront) {
      // Origin Access Identity for S3
      const originAccessIdentity = new cloudfront.OriginAccessIdentity(
        this,
        'MemberBenefitsOAI',
        {
          comment: 'OAI for Member Benefits Assets',
        }
      );

      this.assetsBucket.grantRead(originAccessIdentity);

      // CloudFront distribution
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
            compress: true,
            cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
            originRequestPolicy:
              cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          },
          additionalBehaviors: {
            '/assets/*': {
              origin: new origins.S3Origin(this.assetsBucket, {
                originAccessIdentity,
              }),
              viewerProtocolPolicy:
                cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
              allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
              cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
              compress: true,
              cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
            },
          },
          priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
          enabled: true,
          httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
          minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        }
      );

      // Output CloudFront URL
      new cdk.CfnOutput(this, 'CloudFrontURL', {
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

    // Stack Outputs
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
      exportName: `member-benefits-api-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginPageUrl', {
      value: `${this.api.url}login`,
      description: 'Login Page URL',
      exportName: `member-benefits-login-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'AssetsBucketName', {
      value: this.assetsBucket.bucketName,
      description: 'S3 Bucket for static assets',
      exportName: `member-benefits-assets-bucket-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginFunctionArn', {
      value: this.loginPageFunction.functionArn,
      description: 'Login Page Lambda Function ARN',
      exportName: `member-benefits-login-function-arn-${environment}`,
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Ticket', 'PM-94');
  }
}
```