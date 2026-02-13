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
   * Log retention period in days
   */
  readonly logRetentionDays?: logs.RetentionDays;
}

/**
 * CDK Stack for Member Benefits infrastructure
 * Provisions API Gateway and Lambda function for serving the login page
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly loginFunction: lambda.Function;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const logRetention = props?.logRetentionDays || logs.RetentionDays.ONE_WEEK;

    // Lambda function for serving the login page
    this.loginFunction = new lambda.Function(this, 'MemberBenefitsLoginFunction', {
      functionName: `member-benefits-login-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/member-benefits-login')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: environment,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
      },
      logRetention,
      description: 'Lambda function for serving member benefits login page',
    });

    // API Gateway REST API
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

    // Lambda integration for login endpoint
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
      ],
      apiKeyRequired: false,
    });

    // Add POST method to /member-benefits/login for form submission
    loginResource.addMethod('POST', loginIntegration, {
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
          statusCode: '401',
        },
      ],
      apiKeyRequired: false,
    });

    // CloudWatch Log Group for API Gateway
    new logs.LogGroup(this, 'MemberBenefitsApiLogGroup', {
      logGroupName: `/aws/apigateway/member-benefits-${environment}`,
      retention: logRetention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // CloudWatch Log Group for Lambda
    new logs.LogGroup(this, 'MemberBenefitsLoginFunctionLogGroup', {
      logGroupName: `/aws/lambda/member-benefits-login-${environment}`,
      retention: logRetention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Stack Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'Member Benefits API Gateway endpoint',
      exportName: `member-benefits-api-endpoint-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginEndpoint', {
      value: `${this.api.url}member-benefits/login`,
      description: 'Member Benefits Login page endpoint',
      exportName: `member-benefits-login-endpoint-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginFunctionArn', {
      value: this.loginFunction.functionArn,
      description: 'Member Benefits Login Lambda function ARN',
      exportName: `member-benefits-login-function-arn-${environment}`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'Member Benefits API Gateway ID',
      exportName: `member-benefits-api-id-${environment}`,
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}
```