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
 * CDK Stack for Member Benefits infrastructure
 * 
 * This stack provisions:
 * - S3 bucket for static login page hosting
 * - CloudFront distribution for content delivery
 * - Lambda function for authentication logic
 * - API Gateway endpoint for member benefits API
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly loginPageBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly authFunction: lambda.Function;
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: MemberBenefitsStackProps) {
    super(scope, id, props);

    // Create S3 bucket for static login page
    this.loginPageBucket = this.createLoginPageBucket(props.environment);

    // Create CloudFront distribution
    this.distribution = this.createCloudFrontDistribution(
      this.loginPageBucket,
      props.environment
    );

    // Create Lambda function for authentication
    this.authFunction = this.createAuthLambdaFunction(props.environment);

    // Create API Gateway
    this.api = this.createApiGateway(this.authFunction, props.environment);

    // Deploy static assets
    this.deployStaticAssets(this.loginPageBucket);

    // Output important values
    this.createOutputs();
  }

  /**
   * Creates an S3 bucket for hosting the static login page
   * 
   * @param environment - The environment name
   * @returns The created S3 bucket
   */
  private createLoginPageBucket(environment: string): s3.Bucket {
    const bucket = new s3.Bucket(this, 'MemberBenefitsLoginBucket', {
      bucketName: `member-benefits-login-${environment}-${this.account}`,
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: environment === 'prod',
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

    cdk.Tags.of(bucket).add('Environment', environment);
    cdk.Tags.of(bucket).add('Purpose', 'MemberBenefitsLogin');

    return bucket;
  }

  /**
   * Creates a CloudFront distribution for the login page
   * 
   * @param bucket - The S3 bucket containing static assets
   * @param environment - The environment name
   * @returns The created CloudFront distribution
   */
  private createCloudFrontDistribution(
    bucket: s3.Bucket,
    environment: string
  ): cloudfront.Distribution {
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'MemberBenefitsOAI',
      {
        comment: `OAI for member benefits login page - ${environment}`,
      }
    );

    bucket.grantRead(originAccessIdentity);

    const distribution = new cloudfront.Distribution(
      this,
      'MemberBenefitsDistribution',
      {
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
        comment: `Member Benefits Login Page - ${environment}`,
      }
    );

    cdk.Tags.of(distribution).add('Environment', environment);
    cdk.Tags.of(distribution).add('Purpose', 'MemberBenefitsLogin');

    return distribution;
  }

  /**
   * Creates a Lambda function for member benefits authentication
   * 
   * @param environment - The environment name
   * @returns The created Lambda function
   */
  private createAuthLambdaFunction(environment: string): lambda.Function {
    const authFunction = new lambda.Function(this, 'MemberBenefitsAuthFunction', {
      functionName: `member-benefits-auth-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../lambda/member-benefits-auth')
      ),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        ENVIRONMENT: environment,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
      },
      tracing: lambda.Tracing.ACTIVE,
      logRetention: environment === 'prod' ? 90 : 7,
      description: 'Lambda function for member benefits authentication',
    });

    // Grant necessary permissions
    authFunction.addToRolePolicy(
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

    cdk.Tags.of(authFunction).add('Environment', environment);
    cdk.Tags.of(authFunction).add('Purpose', 'MemberBenefitsAuth');

    return authFunction;
  }

  /**
   * Creates an API Gateway for member benefits endpoints
   * 
   * @param authFunction - The Lambda function to integrate
   * @param environment - The environment name
   * @returns The created API Gateway
   */
  private createApiGateway(
    authFunction: lambda.Function,
    environment: string
  ): apigateway.RestApi {
    const api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `member-benefits-api-${environment}`,
      description: 'API Gateway for member benefits authentication and management',
      deployOptions: {
        stageName: environment,
        tracingEnabled: true,
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
        allowCredentials: true,
      },
      cloudWatchRole: true,
    });

    // Create /auth resource
    const authResource = api.root.addResource('auth');

    // Create /auth/login endpoint
    const loginResource = authResource.addResource('login');
    const loginIntegration = new apigateway.LambdaIntegration(authFunction, {
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

    // Create /auth/validate endpoint
    const validateResource = authResource.addResource('validate');
    validateResource.addMethod('POST', loginIntegration);

    // Create /benefits resource
    const benefitsResource = api.root.addResource('benefits');
    benefitsResource.addMethod('GET', loginIntegration);

    cdk.Tags.of(api).add('Environment', environment);
    cdk.Tags.of(api).add('Purpose', 'MemberBenefitsApi');

    return api;
  }

  /**
   * Deploys static assets to the S3 bucket
   * 
   * @param bucket - The S3 bucket to deploy to
   */
  private deployStaticAssets(bucket: s3.Bucket): void {
    new s3deploy.BucketDeployment(this, 'DeployMemberBenefitsLoginPage', {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, '../../public/member-benefits'))
      ],
      destinationBucket: bucket,
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
    new cdk.CfnOutput(this, 'LoginPageBucketName', {
      value: this.loginPageBucket.bucketName,
      description: 'S3 bucket name for member benefits login page',
      exportName: `MemberBenefitsLoginBucket-${this.stackName}`,
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
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'URL for member benefits login page',
      exportName: `MemberBenefitsLoginUrl-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
      exportName: `MemberBenefitsApiUrl-${this.stackName}`,
    });

    new cdk.CfnOutput(this, 'AuthFunctionArn', {
      value: this.authFunction.functionArn,
      description: 'Lambda function ARN for authentication',
      exportName: `MemberBenefitsAuthFunctionArn-${this.stackName}`,
    });
  }
}