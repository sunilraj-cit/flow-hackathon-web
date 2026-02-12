import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

/**
 * Props for MemberBenefitsStack
 */
export interface MemberBenefitsStackProps extends cdk.StackProps {
  /**
   * Environment name (dev, staging, prod)
   */
  readonly environment: string;
  
  /**
   * Domain name for CloudFront distribution (optional)
   */
  readonly domainName?: string;
}

/**
 * Stack for Member Benefits infrastructure including Lambda functions,
 * API Gateway, and CloudFront distribution
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly loginLambda: lambda.Function;
  public readonly api: apigateway.RestApi;
  public readonly distribution: cloudfront.Distribution;
  public readonly staticAssetsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: MemberBenefitsStackProps) {
    super(scope, id, props);

    // Create S3 bucket for static assets
    this.staticAssetsBucket = this.createStaticAssetsBucket(props.environment);

    // Create Lambda function for login endpoint
    this.loginLambda = this.createLoginLambdaFunction(props.environment);

    // Create API Gateway
    this.api = this.createApiGateway(props.environment);

    // Add /member-benefits/login route
    this.addLoginRoute();

    // Create CloudFront distribution
    this.distribution = this.createCloudFrontDistribution(props.environment);

    // Output important values
    this.createOutputs();
  }

  /**
   * Creates S3 bucket for static assets
   */
  private createStaticAssetsBucket(environment: string): s3.Bucket {
    const bucket = new s3.Bucket(this, 'MemberBenefitsStaticAssets', {
      bucketName: `member-benefits-static-${environment}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
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

    return bucket;
  }

  /**
   * Creates Lambda function for member benefits login
   */
  private createLoginLambdaFunction(environment: string): lambda.Function {
    const loginLambda = new lambda.Function(this, 'MemberBenefitsLoginFunction', {
      functionName: `member-benefits-login-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/member-benefits-login')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: environment,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
        LOG_LEVEL: environment === 'prod' ? 'info' : 'debug',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
      description: 'Lambda function for member benefits login endpoint',
    });

    // Add permissions for CloudWatch Logs
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

    // Add X-Ray permissions
    loginLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'xray:PutTraceSegments',
          'xray:PutTelemetryRecords',
        ],
        resources: ['*'],
      })
    );

    return loginLambda;
  }

  /**
   * Creates API Gateway REST API
   */
  private createApiGateway(environment: string): apigateway.RestApi {
    const api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `member-benefits-api-${environment}`,
      description: 'API Gateway for Member Benefits services',
      deployOptions: {
        stageName: environment,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: environment !== 'prod',
        metricsEnabled: true,
        throttlingBurstLimit: 5000,
        throttlingRateLimit: 2000,
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
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
    });

    return api;
  }

  /**
   * Adds /member-benefits/login route to API Gateway
   */
  private addLoginRoute(): void {
    // Create /member-benefits resource
    const memberBenefitsResource = this.api.root.addResource('member-benefits');

    // Create /member-benefits/login resource
    const loginResource = memberBenefitsResource.addResource('login');

    // Create Lambda integration
    const loginIntegration = new apigateway.LambdaIntegration(this.loginLambda, {
      proxy: true,
      allowTestInvoke: true,
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          },
        },
        {
          statusCode: '400',
          selectionPattern: '.*"statusCode":400.*',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          },
        },
        {
          statusCode: '401',
          selectionPattern: '.*"statusCode":401.*',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          },
        },
        {
          statusCode: '500',
          selectionPattern: '.*"statusCode":500.*',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          },
        },
      ],
    });

    // Add POST method to /member-benefits/login
    loginResource.addMethod('POST', loginIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
        {
          statusCode: '400',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
        {
          statusCode: '401',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
        {
          statusCode: '500',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
      ],
      apiKeyRequired: false,
    });

    // Add GET method for health check
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
  }

  /**
   * Creates CloudFront distribution for member benefits
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
    this.staticAssetsBucket.grantRead(originAccessIdentity);

    // Create cache policy for static assets
    const staticCachePolicy = new cloudfront.CachePolicy(this, 'StaticCachePolicy', {
      cachePolicyName: `member-benefits-static-${environment}`,
      comment: 'Cache policy for static assets',
      defaultTtl: cdk.Duration.days(1),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.seconds(0),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    // Create cache policy for API
    const apiCachePolicy = new cloudfront.CachePolicy(this, 'ApiCachePolicy', {
      cachePolicyName: `member-benefits-api-${environment}`,
      comment: 'Cache policy for API endpoints',
      defaultTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(1),
      minTtl: cdk.Duration.seconds(0),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'Authorization',
        'Content-Type',
        'Accept'
      ),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: cloudfront.CacheCookieBehavior.all(),
    });

    // Create origin request policy for API
    const apiOriginRequestPolicy = new cloudfront.OriginRequestPolicy(
      this,
      'ApiOriginRequestPolicy',
      {
        originRequestPolicyName: `member-benefits-api-${environment}`,
        comment: 'Origin request policy for API endpoints',
        headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
          'Authorization',
          'Content-Type',
          'Accept',
          'Origin',
          'Referer'
        ),
        queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
        cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
      }
    );

    // Create CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'MemberBenefitsDistribution', {
      comment: `Member Benefits Distribution - ${environment}`,
      defaultBehavior: {
        origin: new origins.S3Origin(this.staticAssetsBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: staticCachePolicy,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
      },
      additionalBehaviors: {
        '/member-benefits/*': {
          origin: new origins.RestApiOrigin(this.api, {
            originPath: `/${environment}`,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: apiCachePolicy,
          originRequestPolicy: apiOriginRequestPolicy,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
        },
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
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    return distribution;
  }

  /**
   * Creates CloudFormation outputs
   */
  private createOutputs(): void {
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
      exportName: `member-benefits-api-url-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'LoginEndpoint', {
      value: `${this.api.url}member-benefits/login`,
      description: 'Member Benefits Login Endpoint',
      exportName: `member-benefits-login-endpoint-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL',
      exportName: `member-benefits-cloudfront-url-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: `member-benefits-cloudfront-id-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'StaticAssetsBucketName', {
      value: this.staticAssetsBucket.bucketName,
      description: 'S3 Bucket for Static Assets',
      exportName: `member-benefits-bucket-${this.stackName}`,
    });