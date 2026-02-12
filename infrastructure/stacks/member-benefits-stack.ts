import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as logs from 'aws-cdk-lib/aws-logs';
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
   * Optional domain name for CloudFront distribution
   */
  readonly domainName?: string;
}

/**
 * CDK Stack for Member Benefits infrastructure
 * Provisions API Gateway, Lambda functions, and CloudFront distribution
 * for the member benefits login functionality
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly distribution: cloudfront.Distribution;
  public readonly loginPageLambda: lambda.Function;
  public readonly authenticateLambda: lambda.Function;

  constructor(scope: Construct, id: string, props: MemberBenefitsStackProps) {
    super(scope, id, props);

    // Create Lambda execution role with necessary permissions
    const lambdaRole = new iam.Role(this, 'MemberBenefitsLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for Member Benefits Lambda functions',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Lambda function to serve the login page (GET /member-benefits/login)
    this.loginPageLambda = new lambda.Function(this, 'LoginPageHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/member-benefits/login-page')),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: props.environment,
        NODE_ENV: props.environment === 'prod' ? 'production' : 'development',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      description: 'Serves the member benefits login page',
    });

    // Lambda function to handle authentication (POST /member-benefits/login)
    this.authenticateLambda = new lambda.Function(this, 'AuthenticateHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/member-benefits/authenticate')),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: props.environment,
        NODE_ENV: props.environment === 'prod' ? 'production' : 'development',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      description: 'Handles member benefits authentication',
    });

    // Create API Gateway REST API
    this.api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `member-benefits-api-${props.environment}`,
      description: 'API Gateway for Member Benefits',
      deployOptions: {
        stageName: props.environment,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
        tracingEnabled: true,
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

    // Create /member-benefits resource
    const memberBenefitsResource = this.api.root.addResource('member-benefits');
    
    // Create /member-benefits/login resource
    const loginResource = memberBenefitsResource.addResource('login');

    // Lambda integrations
    const loginPageIntegration = new apigateway.LambdaIntegration(this.loginPageLambda, {
      proxy: true,
      allowTestInvoke: true,
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': "'text/html'",
            'method.response.header.Cache-Control': "'no-cache, no-store, must-revalidate'",
          },
        },
      ],
    });

    const authenticateIntegration = new apigateway.LambdaIntegration(this.authenticateLambda, {
      proxy: true,
      allowTestInvoke: true,
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': "'application/json'",
          },
        },
        {
          statusCode: '401',
          selectionPattern: '.*[UNAUTHORIZED].*',
          responseParameters: {
            'method.response.header.Content-Type': "'application/json'",
          },
        },
      ],
    });

    // GET /member-benefits/login - Serve login page
    loginResource.addMethod('GET', loginPageIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true,
            'method.response.header.Cache-Control': true,
          },
        },
      ],
      apiKeyRequired: false,
    });

    // POST /member-benefits/login - Authenticate user
    loginResource.addMethod('POST', authenticateIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true,
          },
        },
        {
          statusCode: '401',
          responseParameters: {
            'method.response.header.Content-Type': true,
          },
        },
      ],
      apiKeyRequired: false,
    });

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'MemberBenefitsDistribution', {
      comment: `Member Benefits Distribution - ${props.environment}`,
      defaultBehavior: {
        origin: new origins.RestApiOrigin(this.api, {
          originPath: `/${props.environment}`,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: new cloudfront.CachePolicy(this, 'MemberBenefitsCachePolicy', {
          cachePolicyName: `member-benefits-cache-policy-${props.environment}`,
          comment: 'Cache policy for member benefits',
          defaultTtl: cdk.Duration.seconds(0),
          minTtl: cdk.Duration.seconds(0),
          maxTtl: cdk.Duration.days(1),
          cookieBehavior: cloudfront.CacheCookieBehavior.all(),
          headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
            'Authorization',
            'Content-Type',
            'Accept'
          ),
          queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
          enableAcceptEncodingGzip: true,
          enableAcceptEncodingBrotli: true,
        }),
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        compress: true,
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    // Grant API Gateway permission to invoke Lambda functions
    this.loginPageLambda.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));
    this.authenticateLambda.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'Member Benefits API Gateway URL',
      exportName: `MemberBenefitsApiUrl-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'Member Benefits API Gateway ID',
      exportName: `MemberBenefitsApiId-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL',
      exportName: `MemberBenefitsCloudFrontUrl-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: `MemberBenefitsDistributionId-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'LoginPageUrl', {
      value: `https://${this.distribution.distributionDomainName}/member-benefits/login`,
      description: 'Member Benefits Login Page URL',
      exportName: `MemberBenefitsLoginUrl-${props.environment}`,
    });

    // Add tags for resource management
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('Environment', props.environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}
```