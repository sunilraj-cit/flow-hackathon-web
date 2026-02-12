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
 * 
 * This stack provisions:
 * - Lambda function for member benefits login
 * - API Gateway with GET /member-benefits/login route
 * - CloudFront distribution for content delivery
 * - S3 bucket for static assets
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly loginFunction: lambda.Function;
  public readonly api: apigateway.RestApi;
  public readonly distribution: cloudfront.Distribution;
  public readonly assetsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';

    // Create S3 bucket for static assets
    this.assetsBucket = this.createAssetsBucket(environment);

    // Create Lambda function for login
    this.loginFunction = this.createLoginFunction(environment);

    // Create API Gateway
    this.api = this.createApiGateway(environment);

    // Add /member-benefits/login route
    this.addLoginRoute();

    // Create CloudFront distribution
    this.distribution = this.createCloudFrontDistribution(environment);

    // Output important values
    this.createOutputs();
  }

  /**
   * Creates an S3 bucket for static assets
   * 
   * @param environment - The environment name
   * @returns The created S3 bucket
   */
  private createAssetsBucket(environment: string): s3.Bucket {
    const bucket = new s3.Bucket(this, 'MemberBenefitsAssetsBucket', {
      bucketName: `member-benefits-assets-${environment}-${this.account}`,
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: environment === 'prod',
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3600,
        },
      ],
    });

    new cdk.CfnOutput(this, 'AssetsBucketName', {
      value: bucket.bucketName,
      description: 'S3 bucket for member benefits static assets',
    });

    return bucket;
  }

  /**
   * Creates the Lambda function for member benefits login
   * 
   * @param environment - The environment name
   * @returns The created Lambda function
   */
  private createLoginFunction(environment: string): lambda.Function {
    const loginFunction = new lambda.Function(this, 'MemberBenefitsLoginFunction', {
      functionName: `member-benefits-login-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Login request received:', JSON.stringify(event, null, 2));
          
          try {
            const headers = {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
              'Access-Control-Allow-Methods': 'GET,OPTIONS'
            };

            // Handle OPTIONS request for CORS
            if (event.httpMethod === 'OPTIONS') {
              return {
                statusCode: 200,
                headers,
                body: ''
              };
            }

            // Extract query parameters
            const queryParams = event.queryStringParameters || {};
            
            // Return login page configuration
            const response = {
              success: true,
              data: {
                title: 'Member Benefits Login',
                buttonColor: 'red',
                environment: '${environment}',
                timestamp: new Date().toISOString()
              },
              queryParams
            };

            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(response)
            };
          } catch (error) {
            console.error('Error processing login request:', error);
            
            return {
              statusCode: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: error.message
              })
            };
          }
        };
      `),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        ENVIRONMENT: environment,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
      },
      description: 'Lambda function for member benefits login endpoint',
    });

    // Add CloudWatch Logs permissions
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
   * Creates the API Gateway REST API
   * 
   * @param environment - The environment name
   * @returns The created REST API
   */
  private createApiGateway(environment: string): apigateway.RestApi {
    const api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `member-benefits-api-${environment}`,
      description: 'API Gateway for Member Benefits',
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
        maxAge: cdk.Duration.hours(1),
      },
      cloudWatchRole: true,
    });

    return api;
  }

  /**
   * Adds the /member-benefits/login route to the API Gateway
   */
  private addLoginRoute(): void {
    // Create /member-benefits resource
    const memberBenefitsResource = this.api.root.addResource('member-benefits');

    // Create /member-benefits/login resource
    const loginResource = memberBenefitsResource.addResource('login');

    // Create Lambda integration
    const loginIntegration = new apigateway.LambdaIntegration(this.loginFunction, {
      proxy: true,
      allowTestInvoke: true,
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          },
        },
      ],
    });

    // Add GET method
    loginResource.addMethod('GET', loginIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
      ],
      apiKeyRequired: false,
    });

    new cdk.CfnOutput(this, 'LoginEndpoint', {
      value: `${this.api.url}member-benefits/login`,
      description: 'Member Benefits Login API endpoint',
    });
  }

  /**
   * Creates the CloudFront distribution
   * 
   * @param environment - The environment name
   * @returns The created CloudFront distribution
   */
  private createCloudFrontDistribution(environment: string): cloudfront.Distribution {
    // Create Origin Access Identity for S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'MemberBenefitsOAI',
      {
        comment: `OAI for member benefits ${environment}`,
      }
    );

    // Grant read permissions to CloudFront
    this.assetsBucket.grantRead(originAccessIdentity);

    // Create cache policy for API
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
        'Content-Type'
      ),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    // Create cache policy for static assets
    const staticCachePolicy = new cloudfront.CachePolicy(this, 'StaticCachePolicy', {
      cachePolicyName: `member-benefits-static-cache-${environment}`,
      comment: 'Cache policy for static assets',
      defaultTtl: cdk.Duration.days(7),
      minTtl: cdk.Duration.seconds(1),
      maxTtl: cdk.Duration.days(365),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // Create origin request policy for API
    const apiOriginRequestPolicy = new cloudfront.OriginRequestPolicy(
      this,
      'ApiOriginRequestPolicy',
      {
        originRequestPolicyName: `member-benefits-api-origin-${environment}`,
        comment: 'Origin request policy for Member Benefits API',
        headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
          'Accept',
          'Content-Type',
          'Authorization'
        ),
        queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
        cookieBehavior: cloudfront.OriginRequestCookieBehavior.none(),
      }
    );

    // Parse API Gateway URL to get domain
    const apiUrl = new URL(this.api.url);
    const apiDomain = apiUrl.hostname;

    // Create CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'MemberBenefitsDistribution', {
      comment: `Member Benefits Distribution - ${environment}`,
      defaultBehavior: {
        origin: new origins.S3Origin(this.assetsBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: staticCachePolicy,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        compress: true,
      },
      additionalBehaviors: {
        '/member-benefits/*': {
          origin: new origins.HttpOrigin(apiDomain, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
            originSslProtocols: [cloudfront.OriginSslPolicy.TLS_V1_2],
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: apiCachePolicy,
          originRequestPolicy: apiOriginRequestPolicy,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          compress: true,
        },
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 403,
          responsePagePath: '/403.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    return distribution;
  }

  /**
   * Creates CloudFormation outputs for the stack
   */
  private createOutputs(): void {
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
      exportName: `MemberBenefitsApiUrl-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL',
      exportName: `MemberBenefitsCloudFrontUrl-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: `MemberBenefitsDistributionId-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'LoginFunctionArn', {
      value: this.loginFunction.functionArn,
      description: 'Login Lambda Function ARN',
      exportName: `MemberBenefitsLoginFunctionArn-${this.stackName}`,
    });
  }
}
```