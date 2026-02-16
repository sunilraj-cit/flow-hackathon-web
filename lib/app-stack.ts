import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { MemberBenefitsStack } from './member-benefits-stack';

/**
 * Props for AppStack
 */
export interface AppStackProps extends cdk.StackProps {
  /**
   * Environment name (e.g., 'dev', 'staging', 'prod')
   */
  readonly environment?: string;
  
  /**
   * API Gateway stage name
   */
  readonly stageName?: string;
}

/**
 * Main application stack that orchestrates all infrastructure components
 * including API Gateway, Lambda functions, and DynamoDB tables
 */
export class AppStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly memberBenefitsStack: MemberBenefitsStack;

  constructor(scope: Construct, id: string, props?: AppStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';
    const stageName = props?.stageName || 'api';

    // Create API Gateway
    this.api = new apigateway.RestApi(this, 'AppApi', {
      restApiName: `app-api-${environment}`,
      description: 'Main application API Gateway',
      deployOptions: {
        stageName,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
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
    });

    // Create member benefits stack
    this.memberBenefitsStack = new MemberBenefitsStack(this, 'MemberBenefitsStack', {
      environment,
    });

    // Integrate member benefits routes with API Gateway
    this.integrateMemberBenefitsRoutes();

    // Add existing routes (tasks, challenges, etc.)
    this.integrateExistingRoutes();

    // Output API endpoint
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
      exportName: `${environment}-api-endpoint`,
    });

    // Output member benefits API endpoint
    new cdk.CfnOutput(this, 'MemberBenefitsEndpoint', {
      value: `${this.api.url}member-benefits`,
      description: 'Member Benefits API endpoint URL',
      exportName: `${environment}-member-benefits-endpoint`,
    });
  }

  /**
   * Integrates member benefits Lambda functions with API Gateway routes
   * Creates the /member-benefits resource and associated methods
   */
  private integrateMemberBenefitsRoutes(): void {
    // Create /member-benefits resource
    const memberBenefitsResource = this.api.root.addResource('member-benefits');

    // GET /member-benefits - List all member benefits
    memberBenefitsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(this.memberBenefitsStack.getMemberBenefitsFunction, {
        proxy: true,
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': "'*'",
            },
          },
        ],
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
            },
          },
        ],
      }
    );

    // POST /member-benefits - Create a new member benefit
    memberBenefitsResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(this.memberBenefitsStack.createMemberBenefitFunction, {
        proxy: true,
        integrationResponses: [
          {
            statusCode: '201',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': "'*'",
            },
          },
        ],
      }),
      {
        methodResponses: [
          {
            statusCode: '201',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
            },
          },
        ],
      }
    );

    // Create /member-benefits/{id} resource for individual benefit operations
    const memberBenefitByIdResource = memberBenefitsResource.addResource('{id}');

    // GET /member-benefits/{id} - Get a specific member benefit
    memberBenefitByIdResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(this.memberBenefitsStack.getMemberBenefitByIdFunction, {
        proxy: true,
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': "'*'",
            },
          },
        ],
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
            },
          },
        ],
      }
    );

    // PUT /member-benefits/{id} - Update a member benefit
    memberBenefitByIdResource.addMethod(
      'PUT',
      new apigateway.LambdaIntegration(this.memberBenefitsStack.updateMemberBenefitFunction, {
        proxy: true,
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': "'*'",
            },
          },
        ],
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
            },
          },
        ],
      }
    );

    // DELETE /member-benefits/{id} - Delete a member benefit
    memberBenefitByIdResource.addMethod(
      'DELETE',
      new apigateway.LambdaIntegration(this.memberBenefitsStack.deleteMemberBenefitFunction, {
        proxy: true,
        integrationResponses: [
          {
            statusCode: '204',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': "'*'",
            },
          },
        ],
      }),
      {
        methodResponses: [
          {
            statusCode: '204',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
            },
          },
        ],
      }
    );
  }

  /**
   * Integrates existing application routes (tasks, challenges, etc.)
   * This method should be expanded based on existing application requirements
   */
  private integrateExistingRoutes(): void {
    // Create /tasks resource
    const tasksResource = this.api.root.addResource('tasks');
    
    // Create /challenges resource
    const challengesResource = this.api.root.addResource('challenges');

    // Add health check endpoint
    const healthResource = this.api.root.addResource('health');
    healthResource.addMethod(
      'GET',
      new apigateway.MockIntegration({
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': JSON.stringify({
                status: 'healthy',
                timestamp: '$context.requestTime',
              }),
            },
          },
        ],
        requestTemplates: {
          'application/json': '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
          },
        ],
      }
    );
  }
}