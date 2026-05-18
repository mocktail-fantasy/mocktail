import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
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

    // ── S3 ──────────────────────────────────────────────────────────────────
    const dataBucket = new s3.Bucket(this, 'DataBucket', {
      bucketName: 'mocktail-data-prod',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ── CloudFront ───────────────────────────────────────────────────────────
    // 1-year TTL — Lambda invalidation is the sole cache-busting mechanism.
    const cachePolicy = new cloudfront.CachePolicy(this, 'DataCachePolicy', {
      defaultTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.seconds(0),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    const distribution = new cloudfront.Distribution(this, 'DataDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(dataBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy,
      },
    });

    // ── Lambda ───────────────────────────────────────────────────────────────
    // Nightly ingestion: fetches FantasyPros rankings + NflVerse rosters,
    // builds active_rosters.json + rankings.json, uploads to S3, invalidates CF.
    const ingestionFn = new lambda.Function(this, 'IngestionFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'ingest.lambda_handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../infra/lambda')),
      layers: [
        lambda.LayerVersion.fromLayerVersionArn(
          this,
          'PandasLayer',
          `arn:aws:lambda:${this.region}:336392948345:layer:AWSSDKPandas-Python312:16`,
        ),
      ],
      timeout: cdk.Duration.minutes(15),
      memorySize: 2048,
      ephemeralStorageSize: cdk.Size.gibibytes(2),
      environment: {
        BUCKET: dataBucket.bucketName,
        DISTRIBUTION_ID: distribution.distributionId,
        FP_API_KEY: process.env.FP_API_KEY ?? '',
      },
    });

    dataBucket.grantReadWrite(ingestionFn);

    ingestionFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cloudfront:CreateInvalidation'],
      resources: [
        `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
      ],
    }));

    // ── EventBridge ──────────────────────────────────────────────────────────
    // Runs nightly at 3am ET (8am UTC).
    new events.Rule(this, 'IngestionSchedule', {
      schedule: events.Schedule.cron({ hour: '8', minute: '0' }),
      targets: [new targets.LambdaFunction(ingestionFn)],
    });

    // ── Outputs ──────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'DataDistributionUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'Set as DATA_BASE_URL in Vercel environment variables',
    });

    new cdk.CfnOutput(this, 'ProjectionsTableName', {
      value: this.projectionsTable.tableName,
      description: 'Set as DYNAMODB_TABLE_NAME in Vercel environment variables',
    });

    new cdk.CfnOutput(this, 'ProjectionsTableArn', {
      value: this.projectionsTable.tableArn,
    });
  }
}
