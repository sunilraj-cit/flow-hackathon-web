import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
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
   * CORS allowed origins
   */
  readonly allowedOrigins?: string[];
}

/**
 * CDK Stack for Member Benefits infrastructure
 * 
 * This stack provisions:
 * - API Gateway REST API for member benefits endpoints
 * - Lambda function for login endpoint
 * - CloudWatch Log Groups for monitoring
 * - IAM roles and permissions
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly loginFunction: lambda.Function;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const allowedOrigins = props?.allowedOrigins || ['*'];

    // Create Lambda function for member benefits login
    this.loginFunction = this.createLoginFunction(environment);

    // Create API Gateway
    this.api = this.createApiGateway(environment, allowedOrigins);

    // Add login route to API Gateway
    this.addLoginRoute();

    // Output API endpoint
    new cdk.CfnOutput(this, 'MemberBenefitsApiUrl', {
      value: this.api.url,
      description: 'Member Benefits API Gateway URL',
      exportName: `${environment}-member-benefits-api-url`,
    });

    new cdk.CfnOutput(this, 'LoginFunctionArn', {
      value: this.loginFunction.functionArn,
      description: 'Member Benefits Login Lambda Function ARN',
      exportName: `${environment}-member-benefits-login-function-arn`,
    });
  }

  /**
   * Creates the Lambda function for member benefits login
   * 
   * @param environment - The deployment environment
   * @returns Lambda Function construct
   */
  private createLoginFunction(environment: string): lambda.Function {
    // Create CloudWatch Log Group with retention policy
    const logGroup = new logs.LogGroup(this, 'LoginFunctionLogGroup', {
      logGroupName: `/aws/lambda/${environment}-member-benefits-login`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create Lambda function
    const loginFunction = new lambda.Function(this, 'LoginFunction', {
      functionName: `${environment}-member-benefits-login`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/member-benefits-login')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        ENVIRONMENT: environment,
        LOG_LEVEL: environment === 'prod' ? 'info' : 'debug',
      },
      logGroup,
      description: 'Lambda function for member benefits login endpoint',
    });

    // Grant permissions for CloudWatch Logs
    loginFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: [logGroup.logGroupArn],
      })
    );

    return loginFunction;
  }

  /**
   * Creates the API Gateway REST API
   * 
   * @param environment - The deployment environment
   * @param allowedOrigins - Array of allowed CORS origins
   * @returns RestApi construct
   */
  private createApiGateway(environment: string, allowedOrigins: string[]): apigateway.RestApi {
    const api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `${environment}-member-benefits-api`,
      description: 'API Gateway for Member Benefits services',
      deployOptions: {
        stageName: environment,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
        tracingEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: allowedOrigins,
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
      },
      cloudWatchRole: true,
    });

    return api;
  }

  /**
   * Adds the login route to the API Gateway
   * 
   * Creates POST /login endpoint integrated with the login Lambda function
   */
  private addLoginRoute(): void {
    // Create /login resource
    const loginResource = this.api.root.addResource('login');

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

    // Add POST method to /login
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
        restApi: this.api,
        requestValidatorName: 'login-request-validator',
        validateRequestBody: true,
        validateRequestParameters: false,
      }),
      requestModels: {
        'application/json': new apigateway.Model(this, 'LoginRequestModel', {
          restApi: this.api,
          contentType: 'application/json',
          modelName: 'LoginRequest',
          schema: {
            type: apigateway.JsonSchemaType.OBJECT,
            required: ['email', 'password'],
            properties: {
              email: {
                type: apigateway.JsonSchemaType.STRING,
                format: 'email',
                minLength: 1,
              },
              password: {
                type: apigateway.JsonSchemaType.STRING,
                minLength: 1,
              },
            },
          },
        }),
      },
    });
  }
}