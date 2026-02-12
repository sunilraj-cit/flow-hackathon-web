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
   * API Gateway stage name
   */
  readonly stageName?: string;
}

/**
 * CDK Stack for Member Benefits infrastructure
 * 
 * This stack provisions:
 * - Lambda function for member benefits login
 * - API Gateway REST API with /member-benefits/login endpoint
 * - CloudWatch log groups for monitoring
 * - IAM roles and permissions
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly loginFunction: lambda.Function;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const stageName = props?.stageName || 'api';

    // Create Lambda execution role
    const lambdaRole = new iam.Role(this, 'MemberBenefitsLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for Member Benefits Lambda functions',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Create CloudWatch log group for Lambda function
    const loginFunctionLogGroup = new logs.LogGroup(this, 'LoginFunctionLogGroup', {
      logGroupName: `/aws/lambda/member-benefits-login-${environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create Lambda function for login endpoint
    this.loginFunction = new lambda.Function(this, 'MemberBenefitsLoginFunction', {
      functionName: `member-benefits-login-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/member-benefits/login')),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        ENVIRONMENT: environment,
        LOG_LEVEL: 'INFO',
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
      },
      logGroup: loginFunctionLogGroup,
      description: 'Handles member benefits login requests',
    });

    // Create API Gateway REST API
    this.api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `member-benefits-api-${environment}`,
      description: 'API Gateway for Member Benefits services',
      deployOptions: {
        stageName: stageName,
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
      cloudWatchRole: true,
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
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          },
        },
        {
          statusCode: '400',
          selectionPattern: '.*"statusCode":400.*',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          },
        },
        {
          statusCode: '401',
          selectionPattern: '.*"statusCode":401.*',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          },
        },
        {
          statusCode: '500',
          selectionPattern: '.*"statusCode":500.*',
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
      requestValidatorOptions: {
        validateRequestBody: true,
        validateRequestParameters: false,
      },
    });

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'Member Benefits API Gateway URL',
      exportName: `MemberBenefitsApiUrl-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginEndpoint', {
      value: `${this.api.url}member-benefits/login`,
      description: 'Member Benefits Login Endpoint URL',
      exportName: `MemberBenefitsLoginEndpoint-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginFunctionArn', {
      value: this.loginFunction.functionArn,
      description: 'Member Benefits Login Lambda Function ARN',
      exportName: `MemberBenefitsLoginFunctionArn-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginFunctionName', {
      value: this.loginFunction.functionName,
      description: 'Member Benefits Login Lambda Function Name',
      exportName: `MemberBenefitsLoginFunctionName-${environment}`,
    });

    // Add tags
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Ticket', 'PM-97');
  }
}
```