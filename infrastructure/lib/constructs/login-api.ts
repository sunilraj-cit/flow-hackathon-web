import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

/**
 * Properties for the LoginApi construct
 */
export interface LoginApiProps {
  /**
   * The API Gateway REST API to attach the login endpoints to
   */
  readonly api: apigateway.RestApi;

  /**
   * Environment variables to pass to the Lambda functions
   */
  readonly environment?: { [key: string]: string };

  /**
   * Allowed origins for CORS configuration
   * @default ['*']
   */
  readonly allowedOrigins?: string[];

  /**
   * Lambda function timeout in seconds
   * @default 30
   */
  readonly timeout?: cdk.Duration;

  /**
   * Lambda function memory size in MB
   * @default 256
   */
  readonly memorySize?: number;
}

/**
 * CDK construct for login API resources including GET /login and POST /authenticate endpoints
 * with CORS configuration for member benefits login functionality
 */
export class LoginApi extends Construct {
  /**
   * The Lambda function handling GET /login requests
   */
  public readonly loginHandler: lambda.Function;

  /**
   * The Lambda function handling POST /authenticate requests
   */
  public readonly authenticateHandler: lambda.Function;

  /**
   * The API Gateway resource for /login
   */
  public readonly loginResource: apigateway.Resource;

  /**
   * The API Gateway resource for /authenticate
   */
  public readonly authenticateResource: apigateway.Resource;

  constructor(scope: Construct, id: string, props: LoginApiProps) {
    super(scope, id);

    const allowedOrigins = props.allowedOrigins || ['*'];
    const timeout = props.timeout || cdk.Duration.seconds(30);
    const memorySize = props.memorySize || 256;

    // Create Lambda execution role with necessary permissions
    const lambdaRole = new iam.Role(this, 'LoginLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for login API Lambda functions',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Create Lambda function for GET /login endpoint
    this.loginHandler = new lambda.Function(this, 'LoginHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/login')),
      role: lambdaRole,
      timeout,
      memorySize,
      environment: {
        ...props.environment,
        NODE_ENV: process.env.NODE_ENV || 'production',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      description: 'Handles GET /login requests for member benefits login page',
    });

    // Create Lambda function for POST /authenticate endpoint
    this.authenticateHandler = new lambda.Function(this, 'AuthenticateHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/authenticate')),
      role: lambdaRole,
      timeout,
      memorySize,
      environment: {
        ...props.environment,
        NODE_ENV: process.env.NODE_ENV || 'production',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      description: 'Handles POST /authenticate requests for member benefits authentication',
    });

    // CORS configuration
    const corsOptions: apigateway.CorsOptions = {
      allowOrigins: allowedOrigins,
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: [
        'Content-Type',
        'X-Amz-Date',
        'Authorization',
        'X-Api-Key',
        'X-Amz-Security-Token',
        'X-Requested-With',
      ],
      allowCredentials: true,
      maxAge: cdk.Duration.hours(1),
    };

    // Create /login resource
    this.loginResource = props.api.root.addResource('login', {
      defaultCorsPreflightOptions: corsOptions,
    });

    // Create /authenticate resource
    this.authenticateResource = props.api.root.addResource('authenticate', {
      defaultCorsPreflightOptions: corsOptions,
    });

    // Integration for GET /login
    const loginIntegration = new apigateway.LambdaIntegration(this.loginHandler, {
      proxy: true,
      allowTestInvoke: true,
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': `'${allowedOrigins.join(',')}'`,
          },
        },
      ],
    });

    // Integration for POST /authenticate
    const authenticateIntegration = new apigateway.LambdaIntegration(this.authenticateHandler, {
      proxy: true,
      allowTestInvoke: true,
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': `'${allowedOrigins.join(',')}'`,
          },
        },
      ],
    });

    // Add GET method to /login
    this.loginResource.addMethod('GET', loginIntegration, {
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
          statusCode: '500',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
      ],
    });

    // Add POST method to /authenticate
    this.authenticateResource.addMethod('POST', authenticateIntegration, {
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
    });

    // Add CloudWatch alarms for monitoring
    this.createAlarms();

    // Output the endpoint URLs
    new cdk.CfnOutput(this, 'LoginEndpoint', {
      value: `${props.api.url}login`,
      description: 'GET /login endpoint URL',
      exportName: `${cdk.Stack.of(this).stackName}-LoginEndpoint`,
    });

    new cdk.CfnOutput(this, 'AuthenticateEndpoint', {
      value: `${props.api.url}authenticate`,
      description: 'POST /authenticate endpoint URL',
      exportName: `${cdk.Stack.of(this).stackName}-AuthenticateEndpoint`,
    });
  }

  /**
   * Creates CloudWatch alarms for monitoring Lambda function errors and throttles
   * @private
   */
  private createAlarms(): void {
    // Alarm for login handler errors
    const loginErrorMetric = this.loginHandler.metricErrors({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    loginErrorMetric.createAlarm(this, 'LoginHandlerErrorAlarm', {
      threshold: 5,
      evaluationPeriods: 1,
      alarmDescription: 'Alarm when login handler has more than 5 errors in 5 minutes',
      alarmName: `${cdk.Stack.of(this).stackName}-LoginHandlerErrors`,
    });

    // Alarm for authenticate handler errors
    const authenticateErrorMetric = this.authenticateHandler.metricErrors({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    authenticateErrorMetric.createAlarm(this, 'AuthenticateHandlerErrorAlarm', {
      threshold: 5,
      evaluationPeriods: 1,
      alarmDescription: 'Alarm when authenticate handler has more than 5 errors in 5 minutes',
      alarmName: `${cdk.Stack.of(this).stackName}-AuthenticateHandlerErrors`,
    });

    // Alarm for login handler throttles
    const loginThrottleMetric = this.loginHandler.metricThrottles({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    loginThrottleMetric.createAlarm(this, 'LoginHandlerThrottleAlarm', {
      threshold: 10,
      evaluationPeriods: 1,
      alarmDescription: 'Alarm when login handler is throttled more than 10 times in 5 minutes',
      alarmName: `${cdk.Stack.of(this).stackName}-LoginHandlerThrottles`,
    });

    // Alarm for authenticate handler throttles
    const authenticateThrottleMetric = this.authenticateHandler.metricThrottles({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    authenticateThrottleMetric.createAlarm(this, 'AuthenticateHandlerThrottleAlarm', {
      threshold: 10,
      evaluationPeriods: 1,
      alarmDescription: 'Alarm when authenticate handler is throttled more than 10 times in 5 minutes',
      alarmName: `${cdk.Stack.of(this).stackName}-AuthenticateHandlerThrottles`,
    });
  }

  /**
   * Grants the specified IAM principal permission to invoke the login endpoints
   * @param grantee - The IAM principal to grant permissions to
   */
  public grantInvoke(grantee: iam.IGrantable): void {
    this.loginHandler.grantInvoke(grantee);
    this.authenticateHandler.grantInvoke(grantee);
  }
}
```