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
 * - Lambda functions for authentication logic
 * - Routing configuration for login page and auth endpoints
 * - IAM roles and permissions
 * - CloudWatch log groups for monitoring
 * 
 * @ticket PM-105
 */
export class LoginStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly loginPageFunction: lambda.Function;
  public readonly authenticateFunction: lambda.Function;
  public readonly validateTokenFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: LoginStackProps) {
    super(scope, id, props);

    const {
      environment,
      stageName = 'prod',
      lambdaTimeout = 30,
      lambdaMemorySize = 512,
    } = props;

    // Create API Gateway REST API
    this.api = new apigateway.RestApi(this, 'LoginApi', {
      restApiName: `member-benefits-login-api-${environment}`,
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

    // Create Lambda execution role
    const lambdaExecutionRole = new iam.Role(this, 'LoginLambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for login Lambda functions',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Create CloudWatch Log Groups
    const loginPageLogGroup = new logs.LogGroup(this, 'LoginPageLogGroup', {
      logGroupName: `/aws/lambda/login-page-${environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const authenticateLogGroup = new logs.LogGroup(this, 'AuthenticateLogGroup', {
      logGroupName: `/aws/lambda/authenticate-${environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const validateTokenLogGroup = new logs.LogGroup(this, 'ValidateTokenLogGroup', {
      logGroupName: `/aws/lambda/validate-token-${environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda function for serving login page
    this.loginPageFunction = new lambda.Function(this, 'LoginPageFunction', {
      functionName: `login-page-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/login-page')),
      timeout: cdk.Duration.seconds(lambdaTimeout),
      memorySize: lambdaMemorySize,
      role: lambdaExecutionRole,
      environment: {
        ENVIRONMENT: environment,
        LOG_LEVEL: 'INFO',
      },
      logGroup: loginPageLogGroup,
      description: 'Lambda function to serve the login page for member benefits',
    });

    // Lambda function for authentication
    this.authenticateFunction = new lambda.Function(this, 'AuthenticateFunction', {
      functionName: `authenticate-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/authenticate')),
      timeout: cdk.Duration.seconds(lambdaTimeout),
      memorySize: lambdaMemorySize,
      role: lambdaExecutionRole,
      environment: {
        ENVIRONMENT: environment,
        LOG_LEVEL: 'INFO',
      },
      logGroup: authenticateLogGroup,
      description: 'Lambda function to handle user authentication',
    });

    // Lambda function for token validation
    this.validateTokenFunction = new lambda.Function(this, 'ValidateTokenFunction', {
      functionName: `validate-token-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/validate-token')),
      timeout: cdk.Duration.seconds(lambdaTimeout),
      memorySize: lambdaMemorySize,
      role: lambdaExecutionRole,
      environment: {
        ENVIRONMENT: environment,
        LOG_LEVEL: 'INFO',
      },
      logGroup: validateTokenLogGroup,
      description: 'Lambda function to validate authentication tokens',
    });

    // Create Lambda integrations
    const loginPageIntegration = new apigateway.LambdaIntegration(this.loginPageFunction, {
      proxy: true,
      allowTestInvoke: true,
    });

    const authenticateIntegration = new apigateway.LambdaIntegration(this.authenticateFunction, {
      proxy: true,
      allowTestInvoke: true,
    });

    const validateTokenIntegration = new apigateway.LambdaIntegration(this.validateTokenFunction, {
      proxy: true,
      allowTestInvoke: true,
    });

    // Define API resources and methods
    const loginResource = this.api.root.addResource('login');
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

    const authResource = this.api.root.addResource('auth');
    
    const authenticateResource = authResource.addResource('authenticate');
    authenticateResource.addMethod('POST', authenticateIntegration, {
      methodResponses: [
        {
          statusCode: '200',
        },
        {
          statusCode: '400',
        },
        {
          statusCode: '401',
        },
      ],
    });

    const validateResource = authResource.addResource('validate');
    validateResource.addMethod('POST', validateTokenIntegration, {
      methodResponses: [
        {
          statusCode: '200',
        },
        {
          statusCode: '401',
        },
      ],
    });

    // Add health check endpoint
    const healthResource = this.api.root.addResource('health');
    healthResource.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [
        {
          statusCode: '200',
          responseTemplates: {
            'application/json': JSON.stringify({
              status: 'healthy',
              timestamp: '$context.requestTime',
            }),
          },
        },
      ],
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    }), {
      methodResponses: [
        {
          statusCode: '200',
        },
      ],
    });

    // Output API Gateway URL
    new cdk.CfnOutput(this, 'LoginApiUrl', {
      value: this.api.url,
      description: 'Login API Gateway URL',
      exportName: `LoginApiUrl-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginPageUrl', {
      value: `${this.api.url}login`,
      description: 'Login Page URL',
      exportName: `LoginPageUrl-${environment}`,
    });

    new cdk.CfnOutput(this, 'AuthenticateEndpoint', {
      value: `${this.api.url}auth/authenticate`,
      description: 'Authentication Endpoint URL',
      exportName: `AuthenticateEndpoint-${environment}`,
    });

    new cdk.CfnOutput(this, 'ValidateTokenEndpoint', {
      value: `${this.api.url}auth/validate`,
      description: 'Token Validation Endpoint URL',
      exportName: `ValidateTokenEndpoint-${environment}`,
    });

    // Add tags to all resources
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('Ticket', 'PM-105');
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}
```