import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

/**
 * Stack for Member Benefits functionality
 * Provides Lambda functions and API Gateway routes for member benefits features
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Lambda function for login page
    const loginPageFunction = new lambda.Function(this, 'LoginPageFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/member-benefits/login')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'production',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      description: 'Serves the member benefits login page',
    });

    // Create API Gateway
    this.api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: 'Member Benefits API',
      description: 'API Gateway for Member Benefits services',
      deployOptions: {
        stageName: 'prod',
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
      },
    });

    // Create /member-benefits resource
    const memberBenefitsResource = this.api.root.addResource('member-benefits');

    // Create /member-benefits/login resource
    const loginResource = memberBenefitsResource.addResource('login');

    // Add GET method to /member-benefits/login
    const loginIntegration = new apigateway.LambdaIntegration(loginPageFunction, {
      proxy: true,
      allowTestInvoke: true,
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': "'text/html'",
          },
        },
      ],
    });

    loginResource.addMethod('GET', loginIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true,
          },
        },
      ],
    });

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'MemberBenefitsApiUrl', {
      value: this.api.url,
      description: 'Member Benefits API Gateway URL',
      exportName: 'MemberBenefitsApiUrl',
    });

    new cdk.CfnOutput(this, 'LoginPageUrl', {
      value: `${this.api.url}member-benefits/login`,
      description: 'Member Benefits Login Page URL',
      exportName: 'MemberBenefitsLoginPageUrl',
    });

    new cdk.CfnOutput(this, 'LoginPageFunctionArn', {
      value: loginPageFunction.functionArn,
      description: 'Login Page Lambda Function ARN',
      exportName: 'LoginPageFunctionArn',
    });
  }
}