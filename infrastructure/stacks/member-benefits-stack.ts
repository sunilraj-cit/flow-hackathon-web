import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
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
   * Log retention period in days
   */
  readonly logRetentionDays?: logs.RetentionDays;
}

/**
 * CDK Stack for Member Benefits infrastructure
 * Provisions Lambda functions and API Gateway routes for member benefits functionality
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly loginFunction: lambda.Function;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const logRetention = props?.logRetentionDays || logs.RetentionDays.ONE_WEEK;

    // Create Lambda execution role with appropriate permissions
    const lambdaExecutionRole = new iam.Role(this, 'MemberBenefitsLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for Member Benefits Lambda functions',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Add additional permissions for CloudWatch Logs
    lambdaExecutionRole.addToPolicy(
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

    // Create Lambda function for login endpoint
    this.loginFunction = new lambda.Function(this, 'MemberBenefitsLoginFunction', {
      functionName: `member-benefits-login-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/member-benefits/login')),
      role: lambdaExecutionRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        ENVIRONMENT: environment,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
      },
      logRetention: logRetention,
      description: 'Handles member benefits login requests',
    });

    // Create API Gateway REST API
    this.api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `member-benefits-api-${environment}`,
      description: 'API Gateway for Member Benefits services',
      deployOptions: {
        stageName: environment,
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
    });

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
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          },
        },
      ],
    });

    // Add POST method to /member-benefits/login
    loginResource.addMethod('POST', loginIntegration, {
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
      apiKeyRequired: false,
    });

    // Grant API Gateway permission to invoke Lambda
    this.loginFunction.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));

    // Add CloudWatch alarms for monitoring
    const loginFunctionErrors = this.loginFunction.metricErrors({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    new cdk.aws_cloudwatch.Alarm(this, 'LoginFunctionErrorAlarm', {
      metric: loginFunctionErrors,
      threshold: 5,
      evaluationPeriods: 1,
      alarmDescription: 'Alert when login function has more than 5 errors in 5 minutes',
      alarmName: `member-benefits-login-errors-${environment}`,
    });

    // Output API endpoint URL
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'Member Benefits API Gateway endpoint URL',
      exportName: `MemberBenefitsApiEndpoint-${environment}`,
    });

    // Output Lambda function ARN
    new cdk.CfnOutput(this, 'LoginFunctionArn', {
      value: this.loginFunction.functionArn,
      description: 'Member Benefits Login Lambda function ARN',
      exportName: `MemberBenefitsLoginFunctionArn-${environment}`,
    });

    // Output API Gateway ID
    new cdk.CfnOutput(this, 'ApiGatewayId', {
      value: this.api.restApiId,
      description: 'Member Benefits API Gateway ID',
      exportName: `MemberBenefitsApiId-${environment}`,
    });

    // Add tags for resource management
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}
```