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
   * Environment name (e.g., 'dev', 'staging', 'prod')
   */
  readonly environment?: string;
  
  /**
   * Log retention period in days
   */
  readonly logRetentionDays?: logs.RetentionDays;
  
  /**
   * Lambda memory size in MB
   */
  readonly memorySize?: number;
  
  /**
   * Lambda timeout in seconds
   */
  readonly timeout?: cdk.Duration;
}

/**
 * CDK Stack for Member Benefits feature
 * 
 * This stack defines:
 * - Lambda function for member benefits endpoint
 * - API Gateway REST API integration
 * - IAM roles and policies
 * - CloudWatch log groups
 * 
 * @see PM-106: Create new page for member benefits
 */
export class MemberBenefitsStack extends cdk.Stack {
  /**
   * The Lambda function handling member benefits requests
   */
  public readonly memberBenefitsFunction: lambda.Function;
  
  /**
   * The API Gateway REST API
   */
  public readonly api: apigateway.RestApi;
  
  /**
   * The CloudWatch log group for the Lambda function
   */
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const logRetentionDays = props?.logRetentionDays || logs.RetentionDays.ONE_WEEK;
    const memorySize = props?.memorySize || 512;
    const timeout = props?.timeout || cdk.Duration.seconds(30);

    // Create CloudWatch Log Group
    this.logGroup = new logs.LogGroup(this, 'MemberBenefitsLogGroup', {
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
        resources: [this.logGroup.logGroupArn],
      })
    );

    // Create Lambda function
    this.memberBenefitsFunction = new lambda.Function(this, 'MemberBenefitsFunction', {
      functionName: `member-benefits-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/memberBenefits')),
      role: lambdaRole,
      memorySize,
      timeout,
      environment: {
        ENVIRONMENT: environment,
        LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG',
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
      },
      logGroup: this.logGroup,
      description: 'Lambda function for member benefits endpoint (PM-106)',
    });

    // Create API Gateway REST API
    this.api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `member-benefits-api-${environment}`,
      description: 'API Gateway for Member Benefits service',
      deployOptions: {
        stageName: environment,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: environment !== 'prod',
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
      cloudWatchRole: true,
    });

    // Create Lambda integration
    const lambdaIntegration = new apigateway.LambdaIntegration(this.memberBenefitsFunction, {
      proxy: true,
      allowTestInvoke: environment !== 'prod',
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

    // Add GET method to /benefits
    benefitsResource.addMethod('GET', lambdaIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
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
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Add POST method to /benefits
    benefitsResource.addMethod('POST', lambdaIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
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
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Create /benefits/{id} resource for individual benefit operations
    const benefitByIdResource = benefitsResource.addResource('{id}');

    // Add GET method to /benefits/{id}
    benefitByIdResource.addMethod('GET', lambdaIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
        {
          statusCode: '404',
        },
        {
          statusCode: '500',
        },
      ],
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Add CloudWatch alarms for monitoring
    const errorMetric = this.memberBenefitsFunction.metricErrors({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    new cdk.aws_cloudwatch.Alarm(this, 'MemberBenefitsErrorAlarm', {
      alarmName: `member-benefits-errors-${environment}`,
      alarmDescription: 'Alarm when member benefits function errors exceed threshold',
      metric: errorMetric,
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const durationMetric = this.memberBenefitsFunction.metricDuration({
      period: cdk.Duration.minutes(5),
      statistic: 'Average',
    });

    new cdk.aws_cloudwatch.Alarm(this, 'MemberBenefitsDurationAlarm', {
      alarmName: `member-benefits-duration-${environment}`,
      alarmDescription: 'Alarm when member benefits function duration is high',
      metric: durationMetric,
      threshold: 10000, // 10 seconds
      evaluationPeriods: 2,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Output values
    new cdk.CfnOutput(this, 'MemberBenefitsApiUrl', {
      value: this.api.url,
      description: 'URL of the Member Benefits API',
      exportName: `member-benefits-api-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'MemberBenefitsFunctionArn', {
      value: this.memberBenefitsFunction.functionArn,
      description: 'ARN of the Member Benefits Lambda function',
      exportName: `member-benefits-function-arn-${environment}`,
    });

    new cdk.CfnOutput(this, 'MemberBenefitsLogGroupName', {
      value: this.logGroup.logGroupName,
      description: 'Name of the Member Benefits CloudWatch Log Group',
      exportName: `member-benefits-log-group-${environment}`,
    });

    // Add tags
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Ticket', 'PM-106');
  }
}
```