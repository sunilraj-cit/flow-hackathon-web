#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from './infra-stack';
import { LoginStack } from './login-stack';

/**
 * Main CDK application entry point
 * Instantiates and configures all infrastructure stacks
 */
const app = new cdk.App();

// Get environment configuration from context or environment variables
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1',
};

const stackPrefix = app.node.tryGetContext('stackPrefix') || 'MemberBenefits';
const environment = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'dev';

/**
 * Main infrastructure stack
 * Contains core application resources
 */
const infraStack = new InfraStack(app, `${stackPrefix}-InfraStack-${environment}`, {
  env,
  description: 'Main infrastructure stack for member benefits application',
  tags: {
    Environment: environment,
    Application: 'MemberBenefits',
    ManagedBy: 'CDK',
  },
});

/**
 * Login page infrastructure stack (PM-93)
 * Contains resources for the member benefits login page
 * - S3 bucket for static assets
 * - CloudFront distribution for content delivery
 * - Lambda@Edge for authentication
 */
const loginStack = new LoginStack(app, `${stackPrefix}-LoginStack-${environment}`, {
  env,
  description: 'Login page infrastructure for member benefits (PM-93)',
  tags: {
    Environment: environment,
    Application: 'MemberBenefits',
    Feature: 'Login',
    Ticket: 'PM-93',
    ManagedBy: 'CDK',
  },
});

// Add dependencies if login stack depends on infra stack resources
// loginStack.addDependency(infraStack);

// Add stack outputs for cross-stack references
cdk.Tags.of(app).add('Project', 'MemberBenefits');
cdk.Tags.of(app).add('ManagedBy', 'AWS-CDK');

app.synth();
```