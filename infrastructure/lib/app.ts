#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from './infra-stack';
import { LoginStack } from './login-stack';

/**
 * CDK Application entry point
 * Initializes and configures all infrastructure stacks
 */
const app = new cdk.App();

// Get environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Get stage from context or default to 'dev'
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
 * Login stack for member benefits
 * Contains resources for the login page functionality
 * Implements PM-105: Responsive login page with red button design
 */
const loginStack = new LoginStack(app, `LoginStack-${stage}`, {
  env,
  stackName: `member-benefits-login-${stage}`,
  description: 'Login page infrastructure for member benefits application',
  tags: {
    Environment: stage,
    Application: 'MemberBenefits',
    Feature: 'Login',
    ManagedBy: 'CDK',
    Ticket: 'PM-105',
  },
});

// Add dependencies if login stack depends on infra stack resources
loginStack.addDependency(infraStack);

// Add stack outputs
cdk.Tags.of(app).add('Project', 'MemberBenefits');
cdk.Tags.of(app).add('Stage', stage);

app.synth();