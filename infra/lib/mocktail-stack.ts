import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

/**
 * Single stack for all Mocktail infrastructure.
 * Keeping everything here avoids cross-stack reference complexity —
 * future resources (Lambda, S3, CloudFront) can grant/reference
 * each other directly without CloudFormation export/import gymnastics.
 */
export class MocktailStack extends cdk.Stack {
  public readonly projectionsTable: dynamodb.TableV2;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── DynamoDB ────────────────────────────────────────────────────────────
    // Stores user projection data. RETAIN ensures CloudFormation never
    // auto-deletes the table, even if the stack is torn down.
    this.projectionsTable = new dynamodb.TableV2(this, 'ProjectionsTable', {
      tableName: 'mocktail-projections',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'player_id', type: dynamodb.AttributeType.STRING },
      billing: dynamodb.Billing.onDemand(),
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Future resources added here can reference projectionsTable directly:
    //   this.projectionsTable.grantReadWriteData(ingestionLambda);

    new cdk.CfnOutput(this, 'ProjectionsTableName', {
      value: this.projectionsTable.tableName,
      description: 'Set as DYNAMODB_TABLE_NAME in Vercel environment variables',
    });

    new cdk.CfnOutput(this, 'ProjectionsTableArn', {
      value: this.projectionsTable.tableArn,
    });
  }
}
