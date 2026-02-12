import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

/**
 * Props for MemberBenefitsStack
 */
export interface MemberBenefitsStackProps extends cdk.StackProps {
  /**
   * Environment name (e.g., 'dev', 'staging', 'prod')
   */
  readonly environment?: string;
  
  /**
   * Lambda function timeout in seconds
   * @default 30
   */
  readonly lambdaTimeout?: number;
  
  /**
   * Lambda function memory size in MB
   * @default 512
   */
  readonly lambdaMemorySize?: number;
}

/**
 * CDK Stack for Member Benefits infrastructure
 * Provisions API Gateway and Lambda function to serve the login page
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly loginFunction: lambda.Function;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const lambdaTimeout = props?.lambdaTimeout || 30;
    const lambdaMemorySize = props?.lambdaMemorySize || 512;

    // Create Lambda function for serving the login page
    this.loginFunction = new lambda.Function(this, 'MemberBenefitsLoginFunction', {
      functionName: `member-benefits-login-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/member-benefits-login')),
      timeout: cdk.Duration.seconds(lambdaTimeout),
      memorySize: lambdaMemorySize,
      environment: {
        ENVIRONMENT: environment,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      description: 'Lambda function to serve member benefits login page',
    });

    // Create API Gateway REST API
    this.api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `member-benefits-api-${environment}`,
      description: 'API Gateway for Member Benefits',
      deployOptions: {
        stageName: environment,
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
      },
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
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
            'method.response.header.Content-Type': "'text/html'",
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          },
        },
      ],
    });

    // Add GET method to /member-benefits/login
    loginResource.addMethod('GET', loginIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true,
            'method.response.header.Access-Control-Allow-Origin': true,
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

    // Add CloudWatch alarms for monitoring
    const errorMetric = this.loginFunction.metricErrors({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    new cdk.aws_cloudwatch.Alarm(this, 'LoginFunctionErrorAlarm', {
      alarmName: `member-benefits-login-errors-${environment}`,
      alarmDescription: 'Alarm when login function errors exceed threshold',
      metric: errorMetric,
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Output the API endpoint URL
    new cdk.CfnOutput(this, 'MemberBenefitsApiUrl', {
      value: this.api.url,
      description: 'Member Benefits API Gateway URL',
      exportName: `member-benefits-api-url-${environment}`,
    });

    // Output the login endpoint URL
    new cdk.CfnOutput(this, 'LoginEndpointUrl', {
      value: `${this.api.url}member-benefits/login`,
      description: 'Member Benefits Login Page URL',
      exportName: `member-benefits-login-url-${environment}`,
    });

    // Output the Lambda function ARN
    new cdk.CfnOutput(this, 'LoginFunctionArn', {
      value: this.loginFunction.functionArn,
      description: 'Member Benefits Login Lambda Function ARN',
      exportName: `member-benefits-login-function-arn-${environment}`,
    });

    // Add tags for resource management
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Ticket', 'PM-92');
  }
}
```