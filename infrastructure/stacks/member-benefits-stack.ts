import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
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
   * Environment name (e.g., dev, staging, prod)
   */
  readonly environment?: string;
  
  /**
   * Whether to enable CORS for the API
   */
  readonly enableCors?: boolean;
}

/**
 * CDK Stack for Member Benefits infrastructure
 * 
 * This stack provisions:
 * - Lambda function for member benefits login
 * - API Gateway endpoint (/member-benefits/login)
 * - S3 bucket for static assets
 * 
 * @ticket PM-102
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly loginFunction: lambda.Function;
  public readonly api: apigateway.RestApi;
  public readonly assetsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const enableCors = props?.enableCors ?? true;

    // Create S3 bucket for static assets
    this.assetsBucket = this.createAssetsBucket(environment);

    // Create Lambda function for login
    this.loginFunction = this.createLoginFunction(environment);

    // Grant Lambda permissions to access S3 bucket
    this.assetsBucket.grantRead(this.loginFunction);

    // Create API Gateway
    this.api = this.createApiGateway(environment, enableCors);

    // Add /member-benefits/login endpoint
    this.createLoginEndpoint(enableCors);

    // Output important values
    this.createOutputs();
  }

  /**
   * Creates S3 bucket for static assets
   * 
   * @param environment - Environment name
   * @returns S3 Bucket instance
   */
  private createAssetsBucket(environment: string): s3.Bucket {
    const bucket = new s3.Bucket(this, 'MemberBenefitsAssetsBucket', {
      bucketName: `member-benefits-assets-${environment}-${this.account}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          enabled: true,
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3600,
        },
      ],
    });

    cdk.Tags.of(bucket).add('Environment', environment);
    cdk.Tags.of(bucket).add('Service', 'MemberBenefits');
    cdk.Tags.of(bucket).add('Ticket', 'PM-102');

    return bucket;
  }

  /**
   * Creates Lambda function for member benefits login
   * 
   * @param environment - Environment name
   * @returns Lambda Function instance
   */
  private createLoginFunction(environment: string): lambda.Function {
    const lambdaFunction = new lambda.Function(this, 'MemberBenefitsLoginFunction', {
      functionName: `member-benefits-login-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/member-benefits-login')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: environment,
        ASSETS_BUCKET: this.assetsBucket.bucketName,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
      reservedConcurrentExecutions: environment === 'prod' ? 100 : undefined,
    });

    // Add permissions for CloudWatch Logs
    lambdaFunction.addToRolePolicy(
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

    cdk.Tags.of(lambdaFunction).add('Environment', environment);
    cdk.Tags.of(lambdaFunction).add('Service', 'MemberBenefits');
    cdk.Tags.of(lambdaFunction).add('Ticket', 'PM-102');

    return lambdaFunction;
  }

  /**
   * Creates API Gateway REST API
   * 
   * @param environment - Environment name
   * @param enableCors - Whether to enable CORS
   * @returns RestApi instance
   */
  private createApiGateway(environment: string, enableCors: boolean): apigateway.RestApi {
    const api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `member-benefits-api-${environment}`,
      description: 'API Gateway for Member Benefits service',
      deployOptions: {
        stageName: environment,
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: environment !== 'prod',
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: enableCors ? {
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
      } : undefined,
      cloudWatchRole: true,
    });

    cdk.Tags.of(api).add('Environment', environment);
    cdk.Tags.of(api).add('Service', 'MemberBenefits');
    cdk.Tags.of(api).add('Ticket', 'PM-102');

    return api;
  }

  /**
   * Creates /member-benefits/login endpoint
   * 
   * @param enableCors - Whether to enable CORS
   */
  private createLoginEndpoint(enableCors: boolean): void {
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
          responseParameters: enableCors ? {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          } : undefined,
        },
        {
          statusCode: '400',
          selectionPattern: '.*"statusCode":400.*',
          responseParameters: enableCors ? {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          } : undefined,
        },
        {
          statusCode: '401',
          selectionPattern: '.*"statusCode":401.*',
          responseParameters: enableCors ? {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          } : undefined,
        },
        {
          statusCode: '500',
          selectionPattern: '.*"statusCode":500.*',
          responseParameters: enableCors ? {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          } : undefined,
        },
      ],
    });

    // Add POST method to /member-benefits/login
    loginResource.addMethod('POST', loginIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: enableCors ? {
            'method.response.header.Access-Control-Allow-Origin': true,
          } : undefined,
        },
        {
          statusCode: '400',
          responseParameters: enableCors ? {
            'method.response.header.Access-Control-Allow-Origin': true,
          } : undefined,
        },
        {
          statusCode: '401',
          responseParameters: enableCors ? {
            'method.response.header.Access-Control-Allow-Origin': true,
          } : undefined,
        },
        {
          statusCode: '500',
          responseParameters: enableCors ? {
            'method.response.header.Access-Control-Allow-Origin': true,
          } : undefined,
        },
      ],
      requestValidatorOptions: {
        validateRequestBody: true,
        validateRequestParameters: false,
      },
    });

    // Add GET method for health check
    loginResource.addMethod('GET', loginIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: enableCors ? {
            'method.response.header.Access-Control-Allow-Origin': true,
          } : undefined,
        },
      ],
    });
  }

  /**
   * Creates CloudFormation outputs
   */
  private createOutputs(): void {
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'Member Benefits API Gateway URL',
      exportName: `${this.stackName}-ApiUrl`,
    });

    new cdk.CfnOutput(this, 'LoginEndpoint', {
      value: `${this.api.url}member-benefits/login`,
      description: 'Member Benefits Login Endpoint',
      exportName: `${this.stackName}-LoginEndpoint`,
    });

    new cdk.CfnOutput(this, 'AssetsBucketName', {
      value: this.assetsBucket.bucketName,
      description: 'S3 Bucket for Member Benefits static assets',
      exportName: `${this.stackName}-AssetsBucketName`,
    });

    new cdk.CfnOutput(this, 'LoginFunctionArn', {
      value: this.loginFunction.functionArn,
      description: 'Member Benefits Login Lambda Function ARN',
      exportName: `${this.stackName}-LoginFunctionArn`,
    });

    new cdk.CfnOutput(this, 'LoginFunctionName', {
      value: this.loginFunction.functionName,
      description: 'Member Benefits Login Lambda Function Name',
      exportName: `${this.stackName}-LoginFunctionName`,
    });
  }
}
```