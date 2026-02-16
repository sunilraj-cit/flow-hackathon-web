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
   * Lambda function timeout in seconds
   * @default 30
   */
  readonly lambdaTimeout?: number;

  /**
   * Lambda function memory size in MB
   * @default 512
   */
  readonly lambdaMemorySize?: number;

  /**
   * Log retention period in days
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
 * CDK Stack for Member Benefits Infrastructure
 * 
 * This stack provisions:
 * - Lambda function for member benefits processing
 * - API Gateway REST API for HTTP access
 * - IAM roles and policies
 * - CloudWatch log groups
 * 
 * @example
 * ```typescript
 * new MemberBenefitsStack(app, 'MemberBenefitsStack', {
 *   environment: 'prod',
 *   lambdaTimeout: 30,
 *   lambdaMemorySize: 512
 * });
 * ```
 */
export class MemberBenefitsStack extends cdk.Stack {
  /**
   * The Lambda function for member benefits
   */
  public readonly memberBenefitsFunction: lambda.Function;

  /**
   * The API Gateway REST API
   */
  public readonly api: apigateway.RestApi;

  /**
   * The CloudWatch log group for Lambda
   */
  public readonly lambdaLogGroup: logs.LogGroup;

  /**
   * The CloudWatch log group for API Gateway
   */
  public readonly apiLogGroup?: logs.LogGroup;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const lambdaTimeout = props?.lambdaTimeout || 30;
    const lambdaMemorySize = props?.lambdaMemorySize || 512;
    const logRetentionDays = props?.logRetentionDays || logs.RetentionDays.ONE_WEEK;
    const enableApiLogging = props?.enableApiLogging ?? true;

    // Create CloudWatch Log Group for Lambda
    this.lambdaLogGroup = new logs.LogGroup(this, 'MemberBenefitsLambdaLogGroup', {
      logGroupName: `/aws/lambda/member-benefits-${environment}`,
      retention: logRetentionDays,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create IAM role for Lambda function
    const lambdaRole = new iam.Role(this, 'MemberBenefitsLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'IAM role for Member Benefits Lambda function',
      roleName: `member-benefits-lambda-role-${environment}`,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant CloudWatch Logs permissions
    this.lambdaLogGroup.grantWrite(lambdaRole);

    // Add custom policies for member benefits operations
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
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambda/memberBenefits')),
      functionName: `member-benefits-${environment}`,
      description: 'Lambda function for processing member benefits requests',
      timeout: cdk.Duration.seconds(lambdaTimeout),
      memorySize: lambdaMemorySize,
      role: lambdaRole,
      environment: {
        ENVIRONMENT: environment,
        LOG_LEVEL: environment === 'prod' ? 'INFO' : 'DEBUG',
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
      },
      logGroup: this.lambdaLogGroup,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Create API Gateway access log group if enabled
    if (enableApiLogging) {
      this.apiLogGroup = new logs.LogGroup(this, 'MemberBenefitsApiLogGroup', {
        logGroupName: `/aws/apigateway/member-benefits-${environment}`,
        retention: logRetentionDays,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    }

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
        accessLogDestination: this.apiLogGroup
          ? new apigateway.LogGroupLogDestination(this.apiLogGroup)
          : undefined,
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: true,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
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

    // GET /benefits - List all member benefits
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

    // Add CloudFormation outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'Member Benefits API URL',
      exportName: `member-benefits-api-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionArn', {
      value: this.memberBenefitsFunction.functionArn,
      description: 'Member Benefits Lambda Function ARN',
      exportName: `member-benefits-lambda-arn-${environment}`,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: this.memberBenefitsFunction.functionName,
      description: 'Member Benefits Lambda Function Name',
      exportName: `member-benefits-lambda-name-${environment}`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'Member Benefits API Gateway ID',
      exportName: `member-benefits-api-id-${environment}`,
    });

    // Add tags to all resources
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}