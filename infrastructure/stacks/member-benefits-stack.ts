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
  readonly environment: string;
  
  /**
   * Domain name for CloudFront distribution (optional)
   */
  readonly domainName?: string;
  
  /**
   * Certificate ARN for HTTPS (optional)
   */
  readonly certificateArn?: string;
}

/**
 * CDK Stack for Member Benefits infrastructure
 * Includes API Gateway, Lambda functions, and CloudFront distribution
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly loginFunction: lambda.Function;
  public readonly distribution: cloudfront.Distribution;
  public readonly staticBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: MemberBenefitsStackProps) {
    super(scope, id, props);

    // Create S3 bucket for static assets
    this.staticBucket = this.createStaticBucket(props.environment);

    // Create Lambda function for login page
    this.loginFunction = this.createLoginFunction(props.environment);

    // Create API Gateway
    this.api = this.createApiGateway(props.environment);

    // Add login route to API Gateway
    this.addLoginRoute();

    // Create CloudFront distribution
    this.distribution = this.createCloudFrontDistribution(props);

    // Output important values
    this.createOutputs();
  }

  /**
   * Creates S3 bucket for static assets
   * @param environment - Environment name
   * @returns S3 Bucket
   */
  private createStaticBucket(environment: string): s3.Bucket {
    const bucket = new s3.Bucket(this, 'MemberBenefitsStaticBucket', {
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

    cdk.Tags.of(bucket).add('Environment', environment);
    cdk.Tags.of(bucket).add('Project', 'MemberBenefits');

    return bucket;
  }

  /**
   * Creates Lambda function for login page
   * @param environment - Environment name
   * @returns Lambda Function
   */
  private createLoginFunction(environment: string): lambda.Function {
    const loginFunction = new lambda.Function(this, 'LoginPageFunction', {
      functionName: `member-benefits-login-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/login')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: environment,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
        STATIC_BUCKET: this.staticBucket.bucketName,
      },
      tracing: lambda.Tracing.ACTIVE,
      logRetention: environment === 'prod' ? 90 : 7,
      description: 'Lambda function for member benefits login page',
    });

    // Grant read access to static bucket
    this.staticBucket.grantRead(loginFunction);

    cdk.Tags.of(loginFunction).add('Environment', environment);
    cdk.Tags.of(loginFunction).add('Project', 'MemberBenefits');

    return loginFunction;
  }

  /**
   * Creates API Gateway REST API
   * @param environment - Environment name
   * @returns REST API
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
        maxAge: cdk.Duration.days(1),
      },
      cloudWatchRole: true,
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
    });

    cdk.Tags.of(api).add('Environment', environment);
    cdk.Tags.of(api).add('Project', 'MemberBenefits');

    return api;
  }

  /**
   * Adds login route to API Gateway
   */
  private addLoginRoute(): void {
    // Create /login resource
    const loginResource = this.api.root.addResource('login');

    // Create Lambda integration
    const loginIntegration = new apigateway.LambdaIntegration(this.loginFunction, {
      proxy: true,
      allowTestInvoke: true,
      timeout: cdk.Duration.seconds(29),
    });

    // Add GET method for login page
    loginResource.addMethod('GET', loginIntegration, {
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

    // Add POST method for login submission
    loginResource.addMethod('POST', loginIntegration, {
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
          statusCode: '401',
        },
        {
          statusCode: '500',
        },
      ],
    });
  }

  /**
   * Creates CloudFront distribution
   * @param props - Stack props
   * @returns CloudFront Distribution
   */
  private createCloudFrontDistribution(props: MemberBenefitsStackProps): cloudfront.Distribution {
    // Create Origin Access Identity for S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'MemberBenefitsOAI',
      {
        comment: 'OAI for Member Benefits static assets',
      }
    );

    // Grant read permissions to CloudFront
    this.staticBucket.grantRead(originAccessIdentity);

    // Create cache policies
    const staticCachePolicy = new cloudfront.CachePolicy(this, 'StaticCachePolicy', {
      cachePolicyName: `member-benefits-static-${props.environment}`,
      comment: 'Cache policy for static assets',
      defaultTtl: cdk.Duration.days(7),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.seconds(0),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    const apiCachePolicy = new cloudfront.CachePolicy(this, 'ApiCachePolicy', {
      cachePolicyName: `member-benefits-api-${props.environment}`,
      comment: 'Cache policy for API requests',
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

    // Create distribution
    const distribution = new cloudfront.Distribution(this, 'MemberBenefitsDistribution', {
      comment: `Member Benefits CloudFront Distribution - ${props.environment}`,
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
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: apiCachePolicy,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          compress: true,
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
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    cdk.Tags.of(distribution).add('Environment', props.environment);
    cdk.Tags.of(distribution).add('Project', 'MemberBenefits');

    return distribution;
  }

  /**
   * Creates CloudFormation outputs
   */
  private createOutputs(): void {
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
      exportName: `MemberBenefitsApiEndpoint-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'LoginFunctionArn', {
      value: this.loginFunction.functionArn,
      description: 'Login Lambda function ARN',
      exportName: `MemberBenefitsLoginFunctionArn-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'StaticBucketName', {
      value: this.staticBucket.bucketName,
      description: 'S3 bucket name for static assets',
      exportName: `MemberBenefitsStaticBucket-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `MemberBenefitsDistributionId-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
      exportName: `MemberBenefitsDistributionDomain-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'LoginPageUrl', {
      value: `https://${this.distribution.distributionDomainName}/api/login`,
      description: 'Login page URL',
      exportName: `MemberBenefitsLoginUrl-${this.stackName}`,
    });
  }
}
```