import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
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
   * Allowed origins for CORS configuration
   */
  readonly allowedOrigins?: string[];

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
 * 
 * This stack provisions:
 * - API Gateway REST API with CORS configuration
 * - Lambda function for member benefits login
 * - CloudWatch Logs for monitoring
 * - IAM roles and permissions
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly loginLambda: lambda.Function;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const allowedOrigins = props?.allowedOrigins || ['*'];
    const lambdaTimeout = props?.lambdaTimeout || 30;
    const lambdaMemorySize = props?.lambdaMemorySize || 512;

    // Create Lambda function for member benefits login
    this.loginLambda = new lambda.Function(this, 'MemberBenefitsLoginFunction', {
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
      description: 'Lambda function for member benefits login endpoint',
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
        allowOrigins: allowedOrigins,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Amz-User-Agent',
        ],
        allowCredentials: true,
        maxAge: cdk.Duration.hours(1),
      },
      cloudWatchRole: true,
    });

    // Create /member-benefits resource
    const memberBenefitsResource = this.api.root.addResource('member-benefits', {
      defaultCorsPreflightOptions: {
        allowOrigins: allowedOrigins,
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Amz-User-Agent',
        ],
        allowCredentials: true,
      },
    });

    // Create /member-benefits/login resource
    const loginResource = memberBenefitsResource.addResource('login', {
      defaultCorsPreflightOptions: {
        allowOrigins: allowedOrigins,
        allowMethods: ['POST', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Amz-User-Agent',
        ],
        allowCredentials: true,
      },
    });

    // Create Lambda integration
    const loginIntegration = new apigateway.LambdaIntegration(this.loginLambda, {
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

    // Output API Gateway URL
    new cdk.CfnOutput(this, 'MemberBenefitsApiUrl', {
      value: this.api.url,
      description: 'Member Benefits API Gateway URL',
      exportName: `member-benefits-api-url-${environment}`,
    });

    // Output API Gateway ID
    new cdk.CfnOutput(this, 'MemberBenefitsApiId', {
      value: this.api.restApiId,
      description: 'Member Benefits API Gateway ID',
      exportName: `member-benefits-api-id-${environment}`,
    });

    // Output Lambda function ARN
    new cdk.CfnOutput(this, 'MemberBenefitsLoginFunctionArn', {
      value: this.loginLambda.functionArn,
      description: 'Member Benefits Login Lambda Function ARN',
      exportName: `member-benefits-login-function-arn-${environment}`,
    });

    // Output Lambda function name
    new cdk.CfnOutput(this, 'MemberBenefitsLoginFunctionName', {
      value: this.loginLambda.functionName,
      description: 'Member Benefits Login Lambda Function Name',
      exportName: `member-benefits-login-function-name-${environment}`,
    });

    // Add tags to all resources
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}
```