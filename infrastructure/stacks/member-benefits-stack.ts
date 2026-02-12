import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
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
   * Lambda function timeout in seconds
   */
  readonly lambdaTimeout?: number;
  
  /**
   * Lambda function memory size in MB
   */
  readonly lambdaMemorySize?: number;
}

/**
 * CDK Stack for Member Benefits Login Page
 * 
 * This stack provisions:
 * - Lambda function to serve the login page
 * - API Gateway REST API endpoint
 * - CloudWatch Logs for monitoring
 * - IAM roles and permissions
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly loginFunction: lambda.Function;
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const lambdaTimeout = props?.lambdaTimeout || 30;
    const lambdaMemorySize = props?.lambdaMemorySize || 512;

    // Create Lambda execution role
    const lambdaRole = new iam.Role(this, 'MemberBenefitsLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for Member Benefits Login Lambda',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Create CloudWatch Log Group for Lambda
    const logGroup = new logs.LogGroup(this, 'MemberBenefitsLoginLogGroup', {
      logGroupName: `/aws/lambda/member-benefits-login-${environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create Lambda function for serving login page
    this.loginFunction = new lambda.Function(this, 'MemberBenefitsLoginFunction', {
      functionName: `member-benefits-login-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/member-benefits-login')),
      timeout: cdk.Duration.seconds(lambdaTimeout),
      memorySize: lambdaMemorySize,
      role: lambdaRole,
      logGroup: logGroup,
      environment: {
        ENVIRONMENT: environment,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
        LOG_LEVEL: environment === 'prod' ? 'info' : 'debug',
      },
      description: 'Lambda function to serve member benefits login page',
    });

    // Create API Gateway REST API
    this.api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `member-benefits-api-${environment}`,
      description: 'API Gateway for Member Benefits Login',
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
        allowCredentials: true,
      },
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
    });

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

    // Create /login resource
    const loginResource = this.api.root.addResource('login');
    
    // Add GET method to /login
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

    // Add POST method to /login for form submission
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

    // Store API URL
    this.apiUrl = this.api.url;

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'Member Benefits API Gateway URL',
      exportName: `MemberBenefitsApiUrl-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginEndpoint', {
      value: `${this.api.url}login`,
      description: 'Member Benefits Login Page Endpoint',
      exportName: `MemberBenefitsLoginEndpoint-${environment}`,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionArn', {
      value: this.loginFunction.functionArn,
      description: 'Member Benefits Login Lambda Function ARN',
      exportName: `MemberBenefitsLoginFunctionArn-${environment}`,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: this.loginFunction.functionName,
      description: 'Member Benefits Login Lambda Function Name',
      exportName: `MemberBenefitsLoginFunctionName-${environment}`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'Member Benefits API Gateway ID',
      exportName: `MemberBenefitsApiId-${environment}`,
    });

    // Add tags
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Feature', 'LoginPage');
  }
}
```