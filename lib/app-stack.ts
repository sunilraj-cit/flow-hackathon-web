import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { MemberBenefitsStack } from './member-benefits-stack';

/**
 * Main application stack that orchestrates all infrastructure components
 * including the member benefits feature stack
 */
export class AppStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly memberBenefitsStack: MemberBenefitsStack;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create main API Gateway
    this.api = new apigateway.RestApi(this, 'AppApi', {
      restApiName: 'Application API',
      description: 'Main application API Gateway',
      deployOptions: {
        stageName: 'prod',
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
      },
    });

    // Create DynamoDB tables for existing features
    const tasksTable = new dynamodb.Table(this, 'TasksTable', {
      tableName: 'tasks',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    const challengesTable = new dynamodb.Table(this, 'ChallengesTable', {
      tableName: 'challenges',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Instantiate Member Benefits Stack
    this.memberBenefitsStack = new MemberBenefitsStack(this, 'MemberBenefitsStack', {
      api: this.api,
      env: props?.env,
    });

    // Create Lambda execution role with necessary permissions
    const lambdaRole = new iam.Role(this, 'AppLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant table permissions to Lambda role
    tasksTable.grantReadWriteData(lambdaRole);
    challengesTable.grantReadWriteData(lambdaRole);

    // Create Lambda functions for existing features
    const tasksFunction = new lambda.Function(this, 'TasksFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/tasks'),
      role: lambdaRole,
      environment: {
        TASKS_TABLE_NAME: tasksTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const challengesFunction = new lambda.Function(this, 'ChallengesFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/challenges'),
      role: lambdaRole,
      environment: {
        CHALLENGES_TABLE_NAME: challengesTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Create API Gateway resources and integrate with Lambda functions
    const tasksResource = this.api.root.addResource('tasks');
    tasksResource.addMethod('GET', new apigateway.LambdaIntegration(tasksFunction));
    tasksResource.addMethod('POST', new apigateway.LambdaIntegration(tasksFunction));

    const taskResource = tasksResource.addResource('{id}');
    taskResource.addMethod('GET', new apigateway.LambdaIntegration(tasksFunction));
    taskResource.addMethod('PUT', new apigateway.LambdaIntegration(tasksFunction));
    taskResource.addMethod('DELETE', new apigateway.LambdaIntegration(tasksFunction));

    const challengesResource = this.api.root.addResource('challenges');
    challengesResource.addMethod('GET', new apigateway.LambdaIntegration(challengesFunction));
    challengesResource.addMethod('POST', new apigateway.LambdaIntegration(challengesFunction));

    const challengeResource = challengesResource.addResource('{id}');
    challengeResource.addMethod('GET', new apigateway.LambdaIntegration(challengesFunction));
    challengeResource.addMethod('PUT', new apigateway.LambdaIntegration(challengesFunction));
    challengeResource.addMethod('DELETE', new apigateway.LambdaIntegration(challengesFunction));

    // Output important values
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
      exportName: 'AppApiUrl',
    });

    new cdk.CfnOutput(this, 'TasksTableName', {
      value: tasksTable.tableName,
      description: 'Tasks DynamoDB Table Name',
      exportName: 'TasksTableName',
    });

    new cdk.CfnOutput(this, 'ChallengesTableName', {
      value: challengesTable.tableName,
      description: 'Challenges DynamoDB Table Name',
      exportName: 'ChallengesTableName',
    });

    new cdk.CfnOutput(this, 'MemberBenefitsApiUrl', {
      value: `${this.api.url}member-benefits`,
      description: 'Member Benefits API Endpoint',
      exportName: 'MemberBenefitsApiUrl',
    });

    // Add tags for resource management
    cdk.Tags.of(this).add('Application', 'MainApp');
    cdk.Tags.of(this).add('Environment', props?.env?.account || 'development');
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}