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
   * Environment name (dev, staging, prod)
   */
  readonly environment: string;
  
  /**
   * Optional existing API Gateway to integrate with
   */
  readonly existingApi?: apigateway.RestApi;
  
  /**
   * Optional CORS configuration
   */
  readonly corsOptions?: apigateway.CorsOptions;
}

/**
 * CDK Stack for Member Benefits infrastructure
 * Creates Lambda function and API Gateway endpoint for member benefits login
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly loginFunction: lambda.Function;
  public readonly api: apigateway.RestApi;
  public readonly memberBenefitsResource: apigateway.Resource;

  constructor(scope: Construct, id: string, props: MemberBenefitsStackProps) {
    super(scope, id, props);

    // Create Lambda execution role with necessary permissions
    const lambdaRole = new iam.Role(this, 'MemberBenefitsLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for Member Benefits Lambda functions',
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
        resources: ['arn:aws:logs:*:*:*'],
      })
    );

    // Create Lambda function for member benefits login
    this.loginFunction = new lambda.Function(this, 'MemberBenefitsLoginFunction', {
      functionName: `member-benefits-login-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/member-benefits-login')),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: props.environment,
        NODE_ENV: props.environment === 'prod' ? 'production' : 'development',
        LOG_LEVEL: props.environment === 'prod' ? 'info' : 'debug',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      description: 'Lambda function for member benefits login endpoint',
    });

    // Create or use existing API Gateway
    this.api = props.existingApi || new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `member-benefits-api-${props.environment}`,
      description: 'API Gateway for Member Benefits',
      deployOptions: {
        stageName: props.environment,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
        tracingEnabled: true,
      },
      defaultCorsPreflightOptions: props.corsOptions || {
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
    this.memberBenefitsResource = this.api.root.addResource('member-benefits', {
      defaultCorsPreflightOptions: props.corsOptions || {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['POST', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
      },
    });

    // Create /member-benefits/login resource
    const loginResource = this.memberBenefitsResource.addResource('login');

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
          responseModels: {
            'application/json': apigateway.Model.EMPTY_MODEL,
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
      requestValidator: new apigateway.RequestValidator(this, 'LoginRequestValidator', {
        restApi: this.api,
        requestValidatorName: 'login-request-validator',
        validateRequestBody: true,
        validateRequestParameters: false,
      }),
    });

    // Grant API Gateway permission to invoke Lambda
    this.loginFunction.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'MemberBenefitsApiUrl', {
      value: this.api.url,
      description: 'Member Benefits API Gateway URL',
      exportName: `member-benefits-api-url-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'MemberBenefitsLoginEndpoint', {
      value: `${this.api.url}member-benefits/login`,
      description: 'Member Benefits Login Endpoint URL',
      exportName: `member-benefits-login-endpoint-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'MemberBenefitsLoginFunctionArn', {
      value: this.loginFunction.functionArn,
      description: 'Member Benefits Login Lambda Function ARN',
      exportName: `member-benefits-login-function-arn-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'MemberBenefitsLoginFunctionName', {
      value: this.loginFunction.functionName,
      description: 'Member Benefits Login Lambda Function Name',
      exportName: `member-benefits-login-function-name-${props.environment}`,
    });

    // Add tags for resource management
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('Environment', props.environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Component', 'Login');
  }
}
```