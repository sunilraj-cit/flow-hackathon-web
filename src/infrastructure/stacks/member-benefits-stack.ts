import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

/**
 * Props for the MemberBenefitsStack
 */
export interface MemberBenefitsStackProps extends cdk.StackProps {
  /**
   * Environment name (e.g., dev, staging, prod)
   */
  readonly environment: string;
  
  /**
   * Optional CORS allowed origins
   */
  readonly corsAllowedOrigins?: string[];
  
  /**
   * Optional Lambda timeout in seconds
   */
  readonly lambdaTimeout?: number;
  
  /**
   * Optional Lambda memory size in MB
   */
  readonly lambdaMemorySize?: number;
}

/**
 * CDK Stack for Member Benefits infrastructure
 * Provisions API Gateway and Lambda functions for authentication and login
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly authHandler: lambda.Function;
  public readonly loginHandler: lambda.Function;

  constructor(scope: Construct, id: string, props: MemberBenefitsStackProps) {
    super(scope, id, props);

    const {
      environment,
      corsAllowedOrigins = ['*'],
      lambdaTimeout = 30,
      lambdaMemorySize = 512,
    } = props;

    // Create Lambda execution role
    const lambdaRole = new iam.Role(this, 'MemberBenefitsLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for Member Benefits Lambda functions',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Add CloudWatch Logs permissions
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: ['arn:aws:logs:*:*:*'],
      })
    );

    // Create Login Handler Lambda
    this.loginHandler = new lambda.Function(this, 'LoginHandler', {
      functionName: `member-benefits-login-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/login')),
      timeout: cdk.Duration.seconds(lambdaTimeout),
      memorySize: lambdaMemorySize,
      role: lambdaRole,
      environment: {
        ENVIRONMENT: environment,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      description: 'Handles login page requests for member benefits',
    });

    // Create Authentication Handler Lambda
    this.authHandler = new lambda.Function(this, 'AuthHandler', {
      functionName: `member-benefits-auth-${environment}`,
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
      logRetention: logs.RetentionDays.ONE_WEEK,
      description: 'Handles authentication requests for member benefits',
    });

    // Create API Gateway
    this.api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `member-benefits-api-${environment}`,
      description: 'API Gateway for Member Benefits authentication and login',
      deployOptions: {
        stageName: environment,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: corsAllowedOrigins,
        allowMethods: ['GET', 'POST', 'OPTIONS'],
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

    // Create Lambda integrations
    const loginIntegration = new apigateway.LambdaIntegration(this.loginHandler, {
      proxy: true,
      allowTestInvoke: true,
    });

    const authIntegration = new apigateway.LambdaIntegration(this.authHandler, {
      proxy: true,
      allowTestInvoke: true,
    });

    // Create API resources and methods
    const loginResource = this.api.root.addResource('login');
    loginResource.addMethod('GET', loginIntegration, {
      apiKeyRequired: false,
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
          statusCode: '500',
        },
      ],
    });

    const authResource = this.api.root.addResource('auth');
    authResource.addMethod('POST', authIntegration, {
      apiKeyRequired: false,
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

    // Add health check endpoint
    const healthResource = this.api.root.addResource('health');
    healthResource.addMethod(
      'GET',
      new apigateway.MockIntegration({
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
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
          },
        ],
      }
    );

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'Member Benefits API Gateway URL',
      exportName: `member-benefits-api-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginEndpoint', {
      value: `${this.api.url}login`,
      description: 'Login page endpoint',
      exportName: `member-benefits-login-endpoint-${environment}`,
    });

    new cdk.CfnOutput(this, 'AuthEndpoint', {
      value: `${this.api.url}auth`,
      description: 'Authentication endpoint',
      exportName: `member-benefits-auth-endpoint-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginHandlerArn', {
      value: this.loginHandler.functionArn,
      description: 'Login Lambda function ARN',
      exportName: `member-benefits-login-handler-arn-${environment}`,
    });

    new cdk.CfnOutput(this, 'AuthHandlerArn', {
      value: this.authHandler.functionArn,
      description: 'Auth Lambda function ARN',
      exportName: `member-benefits-auth-handler-arn-${environment}`,
    });

    // Add tags
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}