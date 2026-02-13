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

const stage = app.node.tryGetContext('stage') || process.env.STAGE || 'dev';

/**
 * Main infrastructure stack
 * Contains core application resources
 */
const infraStack = new InfraStack(app, `InfraStack-${stage}`, {
  env,
  stackName: `member-benefits-infra-${stage}`,
  description: 'Core infrastructure stack for member benefits application',
  tags: {
    Environment: stage,
    Application: 'MemberBenefits',
    ManagedBy: 'CDK',
  },
});

/**
 * Login page infrastructure stack
 * Contains resources for the member benefits login page (PM-105)
 */
const loginStack = new LoginStack(app, `LoginStack-${stage}`, {
  env,
  stackName: `member-benefits-login-${stage}`,
  description: 'Login page infrastructure for member benefits application (PM-105)',
  tags: {
    Environment: stage,
    Application: 'MemberBenefits',
    Feature: 'Login',
    Ticket: 'PM-105',
    ManagedBy: 'CDK',
  },
});

// Add dependency if login stack depends on infra stack resources
// loginStack.addDependency(infraStack);

// Add stack outputs
cdk.Tags.of(app).add('Project', 'MemberBenefits');
cdk.Tags.of(app).add('Owner', 'Engineering');

app.synth();
```