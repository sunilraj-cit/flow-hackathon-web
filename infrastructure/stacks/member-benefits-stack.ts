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
}

/**
 * CDK Stack for Member Benefits infrastructure
 * Includes Lambda functions, API Gateway routes, and IAM permissions for member login functionality
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly loginApi: apigateway.RestApi;
  public readonly loginLambda: lambda.Function;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const logRetention = props?.logRetentionDays || logs.RetentionDays.ONE_WEEK;

    // Create IAM role for Login Lambda
    const loginLambdaRole = new iam.Role(this, 'LoginLambdaRole', {
      roleName: `member-benefits-login-lambda-role-${environment}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'IAM role for Member Benefits Login Lambda function',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Add additional permissions for the Lambda function
    loginLambdaRole.addToPolicy(
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

    // Add permissions for potential DynamoDB access (for user authentication)
    loginLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:GetItem',
          'dynamodb:Query',
          'dynamodb:Scan',
        ],
        resources: [
          `arn:aws:dynamodb:${this.region}:${this.account}:table/member-benefits-users-${environment}`,
          `arn:aws:dynamodb:${this.region}:${this.account}:table/member-benefits-users-${environment}/index/*`,
        ],
      })
    );

    // Add permissions for Secrets Manager (for storing credentials securely)
    loginLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'secretsmanager:GetSecretValue',
        ],
        resources: [
          `arn:aws:secretsmanager:${this.region}:${this.account}:secret:member-benefits/*`,
        ],
      })
    );

    // Create Login Lambda function
    this.loginLambda = new lambda.Function(this, 'LoginLambda', {
      functionName: `member-benefits-login-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/login')),
      role: loginLambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: environment,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
        LOG_LEVEL: environment === 'prod' ? 'info' : 'debug',
        REGION: this.region,
      },
      description: 'Lambda function for member benefits login authentication',
      logRetention: logRetention,
    });

    // Create API Gateway REST API
    this.loginApi = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `member-benefits-api-${environment}`,
      description: 'API Gateway for Member Benefits login functionality',
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
      cloudWatchRole: true,
    });

    // Create /auth resource
    const authResource = this.loginApi.root.addResource('auth');

    // Create /auth/login resource
    const loginResource = authResource.addResource('login');

    // Create Lambda integration
    const loginIntegration = new apigateway.LambdaIntegration(this.loginLambda, {
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

    // Add POST method to /auth/login
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
      requestValidator: new apigateway.RequestValidator(this, 'LoginRequestValidator', {
        restApi: this.loginApi,
        requestValidatorName: 'login-request-validator',
        validateRequestBody: true,
        validateRequestParameters: false,
      }),
      requestModels: {
        'application/json': new apigateway.Model(this, 'LoginRequestModel', {
          restApi: this.loginApi,
          contentType: 'application/json',
          modelName: 'LoginRequest',
          schema: {
            type: apigateway.JsonSchemaType.OBJECT,
            required: ['email', 'password'],
            properties: {
              email: {
                type: apigateway.JsonSchemaType.STRING,
                format: 'email',
              },
              password: {
                type: apigateway.JsonSchemaType.STRING,
                minLength: 8,
              },
            },
          },
        }),
      },
    });

    // Grant API Gateway permission to invoke Lambda
    this.loginLambda.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.loginApi.url,
      description: 'Member Benefits API Gateway URL',
      exportName: `member-benefits-api-url-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginEndpoint', {
      value: `${this.loginApi.url}auth/login`,
      description: 'Member Benefits Login Endpoint',
      exportName: `member-benefits-login-endpoint-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginLambdaArn', {
      value: this.loginLambda.functionArn,
      description: 'Login Lambda Function ARN',
      exportName: `member-benefits-login-lambda-arn-${environment}`,
    });

    new cdk.CfnOutput(this, 'LoginLambdaName', {
      value: this.loginLambda.functionName,
      description: 'Login Lambda Function Name',
      exportName: `member-benefits-login-lambda-name-${environment}`,
    });

    // Add tags to all resources
    cdk.Tags.of(this).add('Project', 'MemberBenefits');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Component', 'Login');
  }
}
```