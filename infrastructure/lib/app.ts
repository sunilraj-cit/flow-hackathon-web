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
  description: 'Main infrastructure stack for the application',
  tags: {
    Environment: stage,
    Project: 'MemberBenefits',
    ManagedBy: 'CDK',
  },
});

/**
 * Login page infrastructure stack
 * Contains resources for the member benefits login page (PM-105)
 */
const loginStack = new LoginStack(app, `LoginStack-${stage}`, {
  env,
  description: 'Infrastructure stack for member benefits login page',
  tags: {
    Environment: stage,
    Project: 'MemberBenefits',
    Feature: 'Login',
    Ticket: 'PM-105',
    ManagedBy: 'CDK',
  },
});

// Add dependencies if login stack depends on main infrastructure
// loginStack.addDependency(infraStack);

// Synthesize the CloudFormation templates
app.synth();