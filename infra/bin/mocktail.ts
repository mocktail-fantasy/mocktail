#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MocktailStack } from '../lib/mocktail-stack';

const app = new cdk.App();

new MocktailStack(app, 'MocktailStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  description: 'Mocktail — all application infrastructure',
});
