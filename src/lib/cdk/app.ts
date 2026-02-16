#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MemberBenefitsStack } from './stacks/member-benefits-stack';

/**
 * CDK Application entry point
 * Instantiates and deploys the MemberBenefitsStack infrastructure
 */
const app = new cdk.App();

/**
 * Member Benefits Stack
 * Deploys infrastructure for the member benefits feature
 */
new MemberBenefitsStack(app, 'MemberBenefitsStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Infrastructure stack for member benefits page and related resources',
  tags: {
    Project: 'MemberBenefits',
    Environment: process.env.ENVIRONMENT || 'development',
    ManagedBy: 'CDK',
  },
});

app.synth();