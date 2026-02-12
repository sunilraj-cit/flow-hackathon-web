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
 * Creates API Gateway and Lambda function for member benefits login endpoint
 * 
 * @class MemberBenefitsStack
 * @extends {cdk.Stack}
 */
export class MemberBenefitsStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly loginFunction: lambda.Function;

  constructor(scope: Construct, id: string, props?: MemberBenefitsStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const stageName = props?.stageName || 'api';

    // Create Lambda function for login endpoint
    this.loginFunction = this.createLoginFunction(environment);

    // Create API Gateway
    this.api = this.createApiGateway(environment, stageName);

    // Add /member-benefits/login route
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
   * Creates the Lambda function for handling login requests
   * 
   * @private
   * @param {string} environment - Environment name
   * @returns {lambda.Function} Lambda function
   */
  private createLoginFunction(environment: string): lambda.Function {
    const loginFunction = new lambda.Function(this, 'MemberBenefitsLoginFunction', {
      functionName: `${environment}-member-benefits-login`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/member-benefits-login')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ENVIRONMENT: environment,
        NODE_ENV: environment === 'prod' ? 'production' : 'development',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      description: 'Lambda function for member benefits login endpoint',
    });

    // Add necessary IAM permissions
    loginFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: ['*'],
      })
    );

    // Add tags
    cdk.Tags.of(loginFunction).add('Environment', environment);
    cdk.Tags.of(loginFunction).add('Service', 'member-benefits');
    cdk.Tags.of(loginFunction).add('ManagedBy', 'CDK');

    return loginFunction;
  }

  /**
   * Creates the API Gateway REST API
   * 
   * @private
   * @param {string} environment - Environment name
   * @param {string} stageName - API Gateway stage name
   * @returns {apigateway.RestApi} API Gateway REST API
   */
  private createApiGateway(environment: string, stageName: string): apigateway.RestApi {
    const api = new apigateway.RestApi(this, 'MemberBenefitsApi', {
      restApiName: `${environment}-member-benefits-api`,
      description: 'API Gateway for Member Benefits service',
      deployOptions: {
        stageName,
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

    // Add tags
    cdk.Tags.of(api).add('Environment', environment);
    cdk.Tags.of(api).add('Service', 'member-benefits');
    cdk.Tags.of(api).add('ManagedBy', 'CDK');

    return api;
  }

  /**
   * Adds the /member-benefits/login route to the API Gateway
   * 
   * @private
   */
  private addLoginRoute(): void {
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
      requestValidator: new apigateway.RequestValidator(this, 'LoginRequestValidator', {
        restApi: this.api,
        requestValidatorName: 'login-request-validator',
        validateRequestBody: true,
        validateRequestParameters: false,
      }),
    });

    // Add GET method for health check
    loginResource.addMethod('GET', loginIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
      ],
    });
  }
}
```