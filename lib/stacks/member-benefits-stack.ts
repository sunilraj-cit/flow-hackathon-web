import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

/**
 * Stack for Member Benefits API infrastructure
 * Provides API Gateway and Lambda integration for member benefits endpoints
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly loginHandler: lambda.Function;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Lambda function for login endpoint
    this.loginHandler = new lambda.Function(this, 'MemberBenefitsLoginHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/member-benefits-login')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'production',
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      description: 'Handles member benefits login requests',
    });

    // Create API Gateway REST API
    this.api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: 'Member Benefits API',
      description: 'API Gateway for member benefits services',
      deployOptions: {
        stageName: process.env.STAGE || 'prod',
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
          'X-Amz-User-Agent',
        ],
        allowCredentials: true,
        maxAge: cdk.Duration.hours(1),
      },
    });

    // Create /member-benefits resource
    const memberBenefitsResource = this.api.root.addResource('member-benefits', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
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

    // Create /member-benefits/login resource
    const loginResource = memberBenefitsResource.addResource('login', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
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
    const loginIntegration = new apigateway.LambdaIntegration(this.loginHandler, {
      proxy: true,
      allowTestInvoke: true,
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
            'method.response.header.Access-Control-Allow-Methods': "'POST,OPTIONS'",
          },
        },
        {
          statusCode: '400',
          selectionPattern: '4\\d{2}',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          },
        },
        {
          statusCode: '500',
          selectionPattern: '5\\d{2}',
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
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true,
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
      requestValidatorOptions: {
        validateRequestBody: true,
        validateRequestParameters: false,
      },
    });

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'MemberBenefitsApiUrl', {
      value: this.api.url,
      description: 'Member Benefits API Gateway URL',
      exportName: 'MemberBenefitsApiUrl',
    });

    new cdk.CfnOutput(this, 'MemberBenefitsLoginEndpoint', {
      value: `${this.api.url}member-benefits/login`,
      description: 'Member Benefits Login Endpoint URL',
      exportName: 'MemberBenefitsLoginEndpoint',
    });

    new cdk.CfnOutput(this, 'LoginHandlerFunctionName', {
      value: this.loginHandler.functionName,
      description: 'Login Handler Lambda Function Name',
      exportName: 'LoginHandlerFunctionName',
    });

    new cdk.CfnOutput(this, 'LoginHandlerFunctionArn', {
      value: this.loginHandler.functionArn,
      description: 'Login Handler Lambda Function ARN',
      exportName: 'LoginHandlerFunctionArn',
    });
  }
}