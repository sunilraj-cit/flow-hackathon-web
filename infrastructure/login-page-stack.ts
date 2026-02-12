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
   * Path to Lambda function code
   */
  readonly lambdaCodePath?: string;
  
  /**
   * Path to static assets
   */
  readonly staticAssetsPath?: string;
}

/**
 * CDK Stack for deploying the member benefits login page infrastructure
 * 
 * This stack creates:
 * - Lambda function for authentication logic
 * - API Gateway for Lambda integration
 * - S3 bucket for static assets
 * - CloudFront distribution for content delivery
 * 
 * @class LoginPageStack
 * @extends {cdk.Stack}
 */
export class LoginPageStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly loginFunction: lambda.Function;
  public readonly staticBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: LoginPageStackProps) {
    super(scope, id, props);

    const env = props?.environment || 'dev';
    const lambdaCodePath = props?.lambdaCodePath || path.join(__dirname, '../../lambda/login');
    const staticAssetsPath = props?.staticAssetsPath || path.join(__dirname, '../../public');

    // Create S3 bucket for static assets
    this.staticBucket = this.createStaticAssetsBucket(env);

    // Create Lambda function for login authentication
    this.loginFunction = this.createLoginLambdaFunction(env);

    // Create API Gateway
    this.api = this.createApiGateway(env);

    // Create CloudFront distribution
    this.distribution = this.createCloudFrontDistribution(env);

    // Deploy static assets to S3
    this.deployStaticAssets(staticAssetsPath);

    // Output important values
    this.createOutputs();
  }

  /**
   * Creates an S3 bucket for hosting static assets
   * 
   * @private
   * @param {string} env - Environment name
   * @returns {s3.Bucket} The created S3 bucket
   */
  private createStaticAssetsBucket(env: string): s3.Bucket {
    const bucket = new s3.Bucket(this, 'LoginPageStaticAssets', {
      bucketName: `member-benefits-login-${env}-${this.account}`,
      removalPolicy: env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: env !== 'prod',
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: env === 'prod',
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3600,
        },
      ],
    });

    return bucket;
  }

  /**
   * Creates the Lambda function for login authentication
   * 
   * @private
   * @param {string} env - Environment name
   * @returns {lambda.Function} The created Lambda function
   */
  private createLoginLambdaFunction(env: string): lambda.Function {
    const loginFunction = new lambda.Function(this, 'LoginFunction', {
      functionName: `member-benefits-login-${env}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/login')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: env,
        NODE_ENV: env === 'prod' ? 'production' : 'development',
      },
      tracing: lambda.Tracing.ACTIVE,
      logRetention: env === 'prod' ? 90 : 7,
    });

    // Add permissions for CloudWatch Logs
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

    return loginFunction;
  }

  /**
   * Creates API Gateway with Lambda integration
   * 
   * @private
   * @param {string} env - Environment name
   * @returns {apigateway.RestApi} The created API Gateway
   */
  private createApiGateway(env: string): apigateway.RestApi {
    const api = new apigateway.RestApi(this, 'LoginPageApi', {
      restApiName: `member-benefits-login-api-${env}`,
      description: 'API Gateway for member benefits login page',
      deployOptions: {
        stageName: env,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: env !== 'prod',
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
    });

    // Create Lambda integration
    const loginIntegration = new apigateway.LambdaIntegration(this.loginFunction, {
      proxy: true,
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          },
        },
      ],
    });

    // Add /login endpoint
    const loginResource = api.root.addResource('login');
    loginResource.addMethod('POST', loginIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
      ],
    });

    // Add /validate endpoint for token validation
    const validateResource = api.root.addResource('validate');
    validateResource.addMethod('POST', loginIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
      ],
    });

    // Add health check endpoint
    const healthResource = api.root.addResource('health');
    healthResource.addMethod('GET', loginIntegration);

    return api;
  }

  /**
   * Creates CloudFront distribution for static assets and API
   * 
   * @private
   * @param {string} env - Environment name
   * @returns {cloudfront.Distribution} The created CloudFront distribution
   */
  private createCloudFrontDistribution(env: string): cloudfront.Distribution {
    // Create Origin Access Identity for S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'LoginPageOAI',
      {
        comment: `OAI for member benefits login page ${env}`,
      }
    );

    // Grant read permissions to CloudFront
    this.staticBucket.grantRead(originAccessIdentity);

    // Create cache policies
    const staticCachePolicy = new cloudfront.CachePolicy(this, 'StaticCachePolicy', {
      cachePolicyName: `login-page-static-cache-${env}`,
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
      cachePolicyName: `login-page-api-cache-${env}`,
      defaultTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(1),
      minTtl: cdk.Duration.seconds(0),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'Authorization',
        'Content-Type'
      ),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: cloudfront.CacheCookieBehavior.all(),
    });

    // Create distribution
    const distribution = new cloudfront.Distribution(this, 'LoginPageDistribution', {
      comment: `Member benefits login page distribution - ${env}`,
      defaultBehavior: {
        origin: new origins.S3Origin(this.staticBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: staticCachePolicy,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        compress: true,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.RestApiOrigin(this.api),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: apiCachePolicy,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
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

    return distribution;
  }

  /**
   * Deploys static assets to S3 bucket
   * 
   * @private
   * @param {string} staticAssetsPath - Path to static assets directory
   */
  private deployStaticAssets(staticAssetsPath: string): void {
    new s3deploy.BucketDeployment(this, 'DeployLoginPageAssets', {
      sources: [s3deploy.Source.asset(staticAssetsPath)],
      destinationBucket: this.staticBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
      prune: true,
      memoryLimit: 512,
    });
  }

  /**
   * Creates CloudFormation outputs for important resources
   * 
   * @private
   */
  private createOutputs(): void {
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
      exportName: `LoginPageApiEndpoint-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL',
      exportName: `LoginPageCloudFrontUrl-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'StaticBucketName', {
      value: this.staticBucket.bucketName,
      description: 'S3 bucket name for static assets',
      exportName: `LoginPageStaticBucket-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionArn', {
      value: this.loginFunction.functionArn,
      description: 'Login Lambda function ARN',
      exportName: `LoginPageLambdaArn-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `LoginPageDistributionId-${this.stackName}`,
    });
  }
}
```