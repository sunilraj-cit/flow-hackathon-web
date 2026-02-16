#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MemberBenefitsStack } from './stacks/member-benefits-stack';

/**
 * CDK Application entry point
 * Instantiates and deploys the Member Benefits infrastructure stack
 */
const app = new cdk.App();

/**
 * Member Benefits Stack
 * Deploys infrastructure for the member benefits feature including:
 * - API Gateway endpoints
 * - Lambda functions
 * - DynamoDB tables
 * - CloudFront distribution
 * - S3 buckets for static assets
 */
new MemberBenefitsStack(app, 'MemberBenefitsStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Infrastructure stack for Member Benefits feature (PM-106)',
  tags: {
    Project: 'MemberBenefits',
    Environment: process.env.ENVIRONMENT || 'development',
    ManagedBy: 'CDK',
    Ticket: 'PM-106',
  },
});

app.synth();