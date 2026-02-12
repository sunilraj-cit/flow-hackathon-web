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
   * Optional custom domain name for the API
   */
  readonly domainName?: string;
  
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
 * CDK Stack for Member Benefits Login functionality
 * Defines API Gateway, Lambda functions, and routing for login page and authentication
 * 
 * @ticket PM-93 - Create responsive login page for member benefits
 */
export class LoginStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly loginPageFunction: lambda.Function;
  public readonly authenticationFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: LoginStackProps) {
    super(scope, id, props);

    const {
      environment,
      lambdaTimeout = 30,
      lambdaMemorySize = 512,
    } = props;

    // Create Lambda execution role with necessary permissions
    const lambdaExecutionRole = new iam.Role(this, 'LoginLambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for login Lambda functions',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Lambda function for serving the login page
    this.loginPageFunction = new lambda.Function(this, 'LoginPageFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/login-page')),
      functionName: `member-benefits-login-page-${environment}`,
      description: 'Serves the member benefits login page',
      timeout: cdk.Duration.seconds(lambdaTimeout),
      memorySize: lambdaMemorySize,
      role: lambdaExecutionRole,
      environment: {
        ENVIRONMENT: environment,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Lambda function for handling authentication
    this.authenticationFunction = new lambda.Function(this, 'AuthenticationFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/authentication')),
      functionName: `member-benefits-auth-${environment}`,
      description: 'Handles member benefits authentication',
      timeout: cdk.Duration.seconds(lambdaTimeout),
      memorySize: lambdaMemorySize,
      role: lambdaExecutionRole,
      environment: {
        ENVIRONMENT: environment,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Create API Gateway REST API
    this.api = new apigateway.RestApi(this, 'LoginApi', {
      restApiName: `member-benefits-login-api-${environment}`,
      description: 'API Gateway for member benefits login and authentication',
      deployOptions: {
        stageName: environment,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
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

    const authenticationIntegration = new apigateway.LambdaIntegration(this.authenticationFunction, {
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

    // Define API routes
    const loginResource = this.api.root.addResource('login');
    const authResource = this.api.root.addResource('auth');

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

    // POST /auth - Handle authentication
    authResource.addMethod('POST', authenticationIntegration, {
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

    // Add CloudWatch alarms for monitoring
    const loginPageErrorMetric = this.loginPageFunction.metricErrors({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    const authErrorMetric = this.authenticationFunction.metricErrors({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    new cdk.aws_cloudwatch.Alarm(this, 'LoginPageErrorAlarm', {
      metric: loginPageErrorMetric,
      threshold: 5,
      evaluationPeriods: 1,
      alarmDescription: 'Alert when login page function has errors',
      alarmName: `member-benefits-login-page-errors-${environment}`,
    });

    new cdk.aws_cloudwatch.Alarm(this, 'AuthenticationErrorAlarm', {
      metric: authErrorMetric,
      threshold: 10,
      evaluationPeriods: 1,
      alarmDescription: 'Alert when authentication function has errors',
      alarmName: `member-benefits-auth-errors-${environment}`,
    });

    // Output important values
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'URL of the Login API Gateway',
      exportName: `member-benefits-login-api-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginPageUrl', {
      value: `${this.api.url}login`,
      description: 'URL of the login page',
      exportName: `member-benefits-login-page-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'AuthEndpointUrl', {
      value: `${this.api.url}auth`,
      description: 'URL of the authentication endpoint',
      exportName: `member-benefits-auth-endpoint-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginPageFunctionArn', {
      value: this.loginPageFunction.functionArn,
      description: 'ARN of the login page Lambda function',
      exportName: `member-benefits-login-page-function-arn-${environment}`,
    });

    new cdk.CfnOutput(this, 'AuthenticationFunctionArn', {
      value: this.authenticationFunction.functionArn,
      description: 'ARN of the authentication Lambda function',
      exportName: `member-benefits-auth-function-arn-${environment}`,
    });

    // Add tags for resource management
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('Component', 'Login');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Ticket', 'PM-93');
  }
}
```