import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

/**
 * Props for MemberBenefitsStack
 */
export interface MemberBenefitsStackProps extends cdk.StackProps {
  /**
   * Environment name (e.g., dev, staging, prod)
   */
  readonly environment?: string;

  /**
   * Lambda function timeout in seconds
   * @default 30
   */
  readonly lambdaTimeout?: number;

  /**
   * Lambda function memory size in MB
   * @default 256
   */
  readonly lambdaMemorySize?: number;

  /**
   * CloudWatch log retention period in days
   * @default 7
   */
  readonly logRetentionDays?: logs.RetentionDays;

  /**
   * Enable API Gateway access logging
   * @default true
   */
  readonly enableApiLogging?: boolean;
}

/**
 * CDK Stack for Member Benefits resources
 * 
 * This stack provisions:
 * - Lambda function for member benefits processing
 * - API Gateway REST API for HTTP access
 * - IAM roles and policies
 * - CloudWatch log groups
 * 
 * @ticket PM-106
 */
export class MemberBenefitsStack extends cdk.Stack {
  /**
   * Lambda function for member benefits
   */
  public readonly memberBenefitsFunction: lambda.Function;

  /**
   * API Gateway REST API
   */
  public readonly api: apigateway.RestApi;

  /**
   * CloudWatch log group for Lambda function
   */
  public readonly lambdaLogGroup: logs.LogGroup;

  /**
   * CloudWatch log group for API Gateway
   */
  public readonly apiLogGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const lambdaTimeout = props?.lambdaTimeout || 30;
    const lambdaMemorySize = props?.lambdaMemorySize || 256;
    const logRetentionDays = props?.logRetentionDays || logs.RetentionDays.ONE_WEEK;
    const enableApiLogging = props?.enableApiLogging ?? true;

    // Create CloudWatch log group for Lambda function
    this.lambdaLogGroup = new logs.LogGroup(this, 'MemberBenefitsLambdaLogGroup', {
      logGroupName: `/aws/lambda/member-benefits-${environment}`,
      retention: logRetentionDays,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create IAM role for Lambda function
    const lambdaRole = new iam.Role(this, 'MemberBenefitsLambdaRole', {
      roleName: `member-benefits-lambda-role-${environment}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'IAM role for Member Benefits Lambda function',
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
        resources: [this.lambdaLogGroup.logGroupArn],
      })
    );

    // Create Lambda function
    this.memberBenefitsFunction = new lambda.Function(this, 'MemberBenefitsFunction', {
      functionName: `member-benefits-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('src/lambda/memberBenefits'),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(lambdaTimeout),
      memorySize: lambdaMemorySize,
      environment: {
        ENVIRONMENT: environment,
        LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG',
      },
      logGroup: this.lambdaLogGroup,
      description: 'Lambda function for member benefits processing',
    });

    // Create CloudWatch log group for API Gateway
    this.apiLogGroup = new logs.LogGroup(this, 'MemberBenefitsApiLogGroup', {
      logGroupName: `/aws/apigateway/member-benefits-${environment}`,
      retention: logRetentionDays,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create API Gateway REST API
    this.api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `member-benefits-api-${environment}`,
      description: 'API Gateway for Member Benefits service',
      deployOptions: {
        stageName: environment,
        loggingLevel: enableApiLogging
          ? apigateway.MethodLoggingLevel.INFO
          : apigateway.MethodLoggingLevel.OFF,
        dataTraceEnabled: enableApiLogging && environment !== 'prod',
        metricsEnabled: true,
        accessLogDestination: enableApiLogging
          ? new apigateway.LogGroupLogDestination(this.apiLogGroup)
          : undefined,
        accessLogFormat: enableApiLogging
          ? apigateway.AccessLogFormat.jsonWithStandardFields({
              caller: true,
              httpMethod: true,
              ip: true,
              protocol: true,
              requestTime: true,
              resourcePath: true,
              responseLength: true,
              status: true,
              user: true,
            })
          : undefined,
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
    });

    // Create Lambda integration
    const lambdaIntegration = new apigateway.LambdaIntegration(this.memberBenefitsFunction, {
      proxy: true,
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          },
        },
      ],
    });

    // Create /benefits resource
    const benefitsResource = this.api.root.addResource('benefits');

    // GET /benefits - List all benefits
    benefitsResource.addMethod('GET', lambdaIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
      ],
    });

    // POST /benefits - Create new benefit
    benefitsResource.addMethod('POST', lambdaIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
      ],
    });

    // Create /benefits/{id} resource
    const benefitByIdResource = benefitsResource.addResource('{id}');

    // GET /benefits/{id} - Get specific benefit
    benefitByIdResource.addMethod('GET', lambdaIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
      ],
    });

    // PUT /benefits/{id} - Update benefit
    benefitByIdResource.addMethod('PUT', lambdaIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
      ],
    });

    // DELETE /benefits/{id} - Delete benefit
    benefitByIdResource.addMethod('DELETE', lambdaIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
      ],
    });

    // Add CloudWatch alarms for monitoring
    const errorMetric = this.memberBenefitsFunction.metricErrors({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    new cdk.aws_cloudwatch.Alarm(this, 'MemberBenefitsLambdaErrorAlarm', {
      alarmName: `member-benefits-lambda-errors-${environment}`,
      alarmDescription: 'Alarm when Lambda function errors exceed threshold',
      metric: errorMetric,
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    const throttleMetric = this.memberBenefitsFunction.metricThrottles({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    new cdk.aws_cloudwatch.Alarm(this, 'MemberBenefitsLambdaThrottleAlarm', {
      alarmName: `member-benefits-lambda-throttles-${environment}`,
      alarmDescription: 'Alarm when Lambda function throttles exceed threshold',
      metric: throttleMetric,
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    // Stack outputs
    new cdk.CfnOutput(this, 'MemberBenefitsApiUrl', {
      value: this.api.url,
      description: 'Member Benefits API Gateway URL',
      exportName: `member-benefits-api-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'MemberBenefitsFunctionArn', {
      value: this.memberBenefitsFunction.functionArn,
      description: 'Member Benefits Lambda Function ARN',
      exportName: `member-benefits-function-arn-${environment}`,
    });

    new cdk.CfnOutput(this, 'MemberBenefitsFunctionName', {
      value: this.memberBenefitsFunction.functionName,
      description: 'Member Benefits Lambda Function Name',
      exportName: `member-benefits-function-name-${environment}`,
    });

    // Add tags to all resources
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Ticket', 'PM-106');
  }
}