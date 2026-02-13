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
   * Stage name for API Gateway
   */
  readonly stageName?: string;
}

/**
 * CDK Stack for Member Benefits infrastructure
 * Provisions API Gateway and Lambda functions for member benefits features
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly loginFunction: lambda.Function;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const stageName = props?.stageName || 'api';

    // Create Lambda function for login page
    this.loginFunction = this.createLoginFunction(environment);

    // Create API Gateway
    this.api = this.createApiGateway(environment, stageName);

    // Add login route
    this.addLoginRoute();

    // Output API endpoint
    new cdk.CfnOutput(this, 'MemberBenefitsApiUrl', {
      value: this.api.url,
      description: 'Member Benefits API Gateway URL',
      exportName: `${environment}-member-benefits-api-url`,
    });

    new cdk.CfnOutput(this, 'LoginFunctionArn', {
      value: this.loginFunction.functionArn,
      description: 'Login Lambda Function ARN',
      exportName: `${environment}-login-function-arn`,
    });
  }

  /**
   * Creates the Lambda function for the login page endpoint
   * @param environment - The deployment environment
   * @returns Lambda Function
   */
  private createLoginFunction(environment: string): lambda.Function {
    const loginFunction = new lambda.Function(this, 'LoginFunction', {
      functionName: `${environment}-member-benefits-login`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../lambda/login')
      ),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: environment,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
        LOG_LEVEL: environment === 'prod' ? 'info' : 'debug',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      description: 'Lambda function for member benefits login page',
      tracing: lambda.Tracing.ACTIVE,
    });

    // Add tags
    cdk.Tags.of(loginFunction).add('Environment', environment);
    cdk.Tags.of(loginFunction).add('Service', 'member-benefits');
    cdk.Tags.of(loginFunction).add('Feature', 'login');

    return loginFunction;
  }

  /**
   * Creates the API Gateway REST API
   * @param environment - The deployment environment
   * @param stageName - The API Gateway stage name
   * @returns REST API
   */
  private createApiGateway(
    environment: string,
    stageName: string
  ): apigateway.RestApi {
    const api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `${environment}-member-benefits-api`,
      description: 'API Gateway for Member Benefits services',
      deployOptions: {
        stageName,
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

    // Add tags
    cdk.Tags.of(api).add('Environment', environment);
    cdk.Tags.of(api).add('Service', 'member-benefits');

    return api;
  }

  /**
   * Adds the login route to the API Gateway
   */
  private addLoginRoute(): void {
    // Create /login resource
    const loginResource = this.api.root.addResource('login');

    // Create Lambda integration
    const loginIntegration = new apigateway.LambdaIntegration(
      this.loginFunction,
      {
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
      }
    );

    // Add GET method for login page
    loginResource.addMethod('GET', loginIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Content-Type': true,
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
      apiKeyRequired: false,
    });

    // Add POST method for login submission
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
  }
}
```