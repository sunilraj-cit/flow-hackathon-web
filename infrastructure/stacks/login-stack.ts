import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

/**
 * Props for LoginStack configuration
 */
export interface LoginStackProps extends cdk.StackProps {
  /**
   * Environment name (dev, staging, prod)
   */
  readonly environment: string;
  
  /**
   * API Gateway stage name
   */
  readonly stageName?: string;
  
  /**
   * Lambda function timeout in seconds
   */
  readonly lambdaTimeout?: number;
  
  /**
   * Lambda function memory size in MB
   */
  readonly lambdaMemorySize?: number;
}

/**
 * CDK Stack for Login Page and Authentication Infrastructure
 * 
 * This stack defines:
 * - API Gateway REST API for login endpoints
 * - Lambda functions for serving login page and handling authentication
 * - IAM roles and permissions
 * - CloudWatch log groups for monitoring
 * 
 * @ticket PM-105
 */
export class LoginStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly loginPageFunction: lambda.Function;
  public readonly authFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: LoginStackProps) {
    super(scope, id, props);

    const {
      environment,
      stageName = 'prod',
      lambdaTimeout = 30,
      lambdaMemorySize = 512,
    } = props;

    // Create CloudWatch Log Groups
    const loginPageLogGroup = new logs.LogGroup(this, 'LoginPageLogGroup', {
      logGroupName: `/aws/lambda/${environment}-login-page`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const authLogGroup = new logs.LogGroup(this, 'AuthLogGroup', {
      logGroupName: `/aws/lambda/${environment}-auth`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create IAM role for Lambda functions
    const lambdaRole = new iam.Role(this, 'LoginLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'IAM role for login and authentication Lambda functions',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Lambda function for serving login page
    this.loginPageFunction = new lambda.Function(this, 'LoginPageFunction', {
      functionName: `${environment}-login-page`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/login-page')),
      timeout: cdk.Duration.seconds(lambdaTimeout),
      memorySize: lambdaMemorySize,
      role: lambdaRole,
      environment: {
        ENVIRONMENT: environment,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
      },
      logGroup: loginPageLogGroup,
      description: 'Lambda function to serve the member benefits login page',
    });

    // Lambda function for authentication
    this.authFunction = new lambda.Function(this, 'AuthFunction', {
      functionName: `${environment}-auth`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/auth')),
      timeout: cdk.Duration.seconds(lambdaTimeout),
      memorySize: lambdaMemorySize,
      role: lambdaRole,
      environment: {
        ENVIRONMENT: environment,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
      },
      logGroup: authLogGroup,
      description: 'Lambda function to handle authentication requests',
    });

    // Create API Gateway REST API
    this.api = new apigateway.RestApi(this, 'LoginApi', {
      restApiName: `${environment}-login-api`,
      description: 'API Gateway for member benefits login and authentication',
      deployOptions: {
        stageName,
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

    // Create Lambda integrations
    const loginPageIntegration = new apigateway.LambdaIntegration(this.loginPageFunction, {
      proxy: true,
      allowTestInvoke: true,
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': "'text/html'",
          },
        },
      ],
    });

    const authIntegration = new apigateway.LambdaIntegration(this.authFunction, {
      proxy: true,
      allowTestInvoke: true,
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': "'application/json'",
          },
        },
      ],
    });

    // Create API Gateway resources and methods
    const loginResource = this.api.root.addResource('login');
    
    // GET /login - Serve login page
    loginResource.addMethod('GET', loginPageIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true,
          },
        },
      ],
    });

    // POST /login/auth - Handle authentication
    const authResource = loginResource.addResource('auth');
    authResource.addMethod('POST', authIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true,
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

    // Grant API Gateway permission to invoke Lambda functions
    this.loginPageFunction.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));
    this.authFunction.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'Login API Gateway URL',
      exportName: `${environment}-login-api-url`,
    });

    new cdk.CfnOutput(this, 'LoginPageUrl', {
      value: `${this.api.url}login`,
      description: 'Login page URL',
      exportName: `${environment}-login-page-url`,
    });

    new cdk.CfnOutput(this, 'AuthEndpointUrl', {
      value: `${this.api.url}login/auth`,
      description: 'Authentication endpoint URL',
      exportName: `${environment}-auth-endpoint-url`,
    });

    new cdk.CfnOutput(this, 'LoginPageFunctionArn', {
      value: this.loginPageFunction.functionArn,
      description: 'Login page Lambda function ARN',
      exportName: `${environment}-login-page-function-arn`,
    });

    new cdk.CfnOutput(this, 'AuthFunctionArn', {
      value: this.authFunction.functionArn,
      description: 'Authentication Lambda function ARN',
      exportName: `${environment}-auth-function-arn`,
    });

    // Add tags for resource management
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('Ticket', 'PM-105');
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}
```