import { promises as fs } from 'fs';
import path from 'path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import type { RankingConfig } from '@mocktail/core';

/**
 * Rankings persistence. Local dev writes to a JSON file in the repo root; prod
 * writes to DynamoDB. The switch is purely env-based — local dev never touches
 * AWS, prod never touches the filesystem.
 */

const IS_LOCAL = process.env.NODE_ENV !== 'production';
const LOCAL_PATH = path.join(process.cwd(), '.dev-rankings.json');
const TABLE = process.env.RANKINGS_TABLE_NAME ?? 'mocktail-rankings';

// Lazy-init so local dev never instantiates the AWS SDK.
let _client: DynamoDBDocumentClient | null = null;
function ddb(): DynamoDBDocumentClient {
  if (!_client) {
    _client = DynamoDBDocumentClient.from(new DynamoDBClient({
      region: process.env.AWS_REGION ?? 'us-east-1',
    }));
  }
  return _client;
}

async function readLocal(): Promise<RankingConfig[]> {
  try {
    const data = await fs.readFile(LOCAL_PATH, 'utf8');
    return JSON.parse(data) as RankingConfig[];
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

async function writeLocal(rankings: RankingConfig[]): Promise<void> {
  await fs.writeFile(LOCAL_PATH, JSON.stringify(rankings, null, 2));
}

export async function listForUser(userId: string): Promise<RankingConfig[]> {
  if (IS_LOCAL) return readLocal();

  try {
    const result = await ddb().send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'user_id = :uid',
      ExpressionAttributeValues: { ':uid': userId },
    }));
    return (result.Items ?? [])
      .map((item) => item.config as RankingConfig)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch (err) {
    if (err instanceof Error && err.name === 'ResourceNotFoundException') return [];
    throw err;
  }
}

export async function put(userId: string, config: RankingConfig): Promise<void> {
  if (IS_LOCAL) {
    const all = await readLocal();
    const next = [...all.filter((r) => r.id !== config.id), config];
    await writeLocal(next);
    return;
  }
  await ddb().send(new PutCommand({
    TableName: TABLE,
    Item: { user_id: userId, ranking_id: config.id, config, updated_at: config.updatedAt },
  }));
}

export async function getForUser(userId: string, id: string): Promise<RankingConfig | null> {
  if (IS_LOCAL) {
    const all = await readLocal();
    return all.find((r) => r.id === id) ?? null;
  }
  const result = await ddb().send(new GetCommand({
    TableName: TABLE,
    Key: { user_id: userId, ranking_id: id },
  }));
  return (result.Item?.config as RankingConfig | undefined) ?? null;
}

export async function remove(userId: string, id: string): Promise<void> {
  if (IS_LOCAL) {
    const all = await readLocal();
    await writeLocal(all.filter((r) => r.id !== id));
    return;
  }
  await ddb().send(new DeleteCommand({
    TableName: TABLE,
    Key: { user_id: userId, ranking_id: id },
  }));
}
