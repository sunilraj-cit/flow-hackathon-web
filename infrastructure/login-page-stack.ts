import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
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
   * Whether to enable CORS for the API Gateway
   */
  readonly enableCors?: boolean;
  
  /**
   * Custom domain name for the API (optional)
   */
  readonly domainName?: string;
}

/**
 * CDK Stack for Member Benefits Login Page
 * 
 * Creates infrastructure for:
 * - Lambda function for login authentication
 * - API Gateway endpoint for REST API
 * - S3 bucket for static assets (CSS, images)
 * 
 * @ticket PM-94
 */
export class LoginPageStack extends cdk.Stack {
  public readonly loginFunction: lambda.Function;
  public readonly api: apigateway.RestApi;
  public readonly assetsBucket: s3.Bucket;
  public readonly apiUrl: cdk.CfnOutput;
  public readonly bucketUrl: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props?: LoginPageStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const enableCors = props?.enableCors ?? true;

    // Create S3 bucket for static assets (CSS, images, etc.)
    this.assetsBucket = this.createAssetsBucket(environment);

    // Create Lambda function for login authentication
    this.loginFunction = this.createLoginFunction(environment);

    // Grant Lambda permission to read from S3 bucket if needed
    this.assetsBucket.grantRead(this.loginFunction);

    // Create API Gateway
    this.api = this.createApiGateway(environment, enableCors);

    // Create API endpoints
    this.createApiEndpoints();

    // Output the API URL
    this.apiUrl = new cdk.CfnOutput(this, 'LoginApiUrl', {
      value: this.api.url,
      description: 'Login API Gateway URL',
      exportName: `${environment}-login-api-url`,
    });

    // Output the S3 bucket URL
    this.bucketUrl = new cdk.CfnOutput(this, 'AssetsBucketUrl', {
      value: this.assetsBucket.bucketWebsiteUrl,
      description: 'Static Assets S3 Bucket URL',
      exportName: `${environment}-assets-bucket-url`,
    });

    // Output the bucket name
    new cdk.CfnOutput(this, 'AssetsBucketName', {
      value: this.assetsBucket.bucketName,
      description: 'Static Assets S3 Bucket Name',
      exportName: `${environment}-assets-bucket-name`,
    });
  }

  /**
   * Creates an S3 bucket for hosting static assets
   * 
   * @param environment - Environment name
   * @returns S3 Bucket instance
   */
  private createAssetsBucket(environment: string): s3.Bucket {
    const bucket = new s3.Bucket(this, 'LoginPageAssetsBucket', {
      bucketName: `member-benefits-login-assets-${environment}-${this.account}`,
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      websiteIndexDocument: 'index.html',
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: environment === 'prod',
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          enabled: true,
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    // Add bucket policy for public read access
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'PublicReadGetObject',
        effect: iam.Effect.ALLOW,
        principals: [new iam.AnyPrincipal()],
        actions: ['s3:GetObject'],
        resources: [`${bucket.bucketArn}/*`],
      })
    );

    return bucket;
  }

  /**
   * Creates Lambda function for login authentication
   * 
   * @param environment - Environment name
   * @returns Lambda Function instance
   */
  private createLoginFunction(environment: string): lambda.Function {
    const loginFunction = new lambda.Function(this, 'LoginFunction', {
      functionName: `member-benefits-login-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/login')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: environment,
        ASSETS_BUCKET: this.assetsBucket?.bucketName || '',
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
      },
      description: 'Lambda function for member benefits login authentication',
      retryAttempts: 2,
      logRetention: environment === 'prod' ? 30 : 7,
      tracing: lambda.Tracing.ACTIVE,
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
   * Creates API Gateway REST API
   * 
   * @param environment - Environment name
   * @param enableCors - Whether to enable CORS
   * @returns RestApi instance
   */
  private createApiGateway(environment: string, enableCors: boolean): apigateway.RestApi {
    const api = new apigateway.RestApi(this, 'LoginApi', {
      restApiName: `member-benefits-login-api-${environment}`,
      description: 'API Gateway for member benefits login page',
      deployOptions: {
        stageName: environment,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: environment !== 'prod',
        metricsEnabled: true,
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
      },
      defaultCorsPreflightOptions: enableCors
        ? {
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
            maxAge: cdk.Duration.hours(1),
          }
        : undefined,
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
      cloudWatchRole: true,
    });

    return api;
  }

  /**
   * Creates API Gateway endpoints and integrations
   */
  private createApiEndpoints(): void {
    // Create /login resource
    const loginResource = this.api.root.addResource('login');

    // Create Lambda integration
    const loginIntegration = new apigateway.LambdaIntegration(this.loginFunction, {
      proxy: true,
      allowTestInvoke: true,
      timeout: cdk.Duration.seconds(29),
    });

    // Add POST method for login
    loginResource.addMethod('POST', loginIntegration, {
      apiKeyRequired: false,
      authorizationType: apigateway.AuthorizationType.NONE,
      requestValidator: new apigateway.RequestValidator(this, 'LoginRequestValidator', {
        restApi: this.api,
        requestValidatorName: 'login-request-validator',
        validateRequestBody: true,
        validateRequestParameters: false,
      }),
      requestModels: {
        'application/json': this.createLoginRequestModel(),
      },
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': apigateway.Model.EMPTY_MODEL,
          },
        },
        {
          statusCode: '400',
          responseModels: {
            'application/json': apigateway.Model.ERROR_MODEL,
          },
        },
        {
          statusCode: '401',
          responseModels: {
            'application/json': apigateway.Model.ERROR_MODEL,
          },
        },
        {
          statusCode: '500',
          responseModels: {
            'application/json': apigateway.Model.ERROR_MODEL,
          },
        },
      ],
    });

    // Add GET method for health check
    const healthResource = this.api.root.addResource('health');
    healthResource.addMethod('GET', loginIntegration, {
      apiKeyRequired: false,
      authorizationType: apigateway.AuthorizationType.NONE,
    });
  }

  /**
   * Creates request model for login endpoint validation
   * 
   * @returns API Gateway Model
   */
  private createLoginRequestModel(): apigateway.Model {
    return new apigateway.Model(this, 'LoginRequestModel', {
      restApi: this.api,
      contentType: 'application/json',
      modelName: 'LoginRequest',
      description: 'Request model for login endpoint',
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        required: ['username', 'password'],
        properties: {
          username: {
            type: apigateway.JsonSchemaType.STRING,
            minLength: 3,
            maxLength: 100,
          },
          password: {
            type: apigateway.JsonSchemaType.STRING,
            minLength: 8,
            maxLength: 100,
          },
          rememberMe: {
            type: apigateway.JsonSchemaType.BOOLEAN,
          },
        },
      },
    });
  }
}
```