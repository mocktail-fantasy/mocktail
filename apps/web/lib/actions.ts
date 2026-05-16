'use server';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { auth } from '@/auth';
import type { PlayerProjection } from '@mocktail/core';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
}));
const TABLE = process.env.DYNAMODB_TABLE_NAME ?? 'mocktail-projections';

export async function saveProjection(playerId: string, projection: PlayerProjection): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await client.send(new PutCommand({
    TableName: TABLE,
    Item: {
      user_id: session.user.id,
      player_id: playerId,
      projection,
      updated_at: new Date().toISOString(),
    },
  }));
}

export async function getUserProjections(): Promise<Record<string, PlayerProjection>> {
  const session = await auth();
  if (!session?.user?.id) return {};

  const result = await client.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'user_id = :uid',
    ExpressionAttributeValues: { ':uid': session.user.id },
  }));

  const out: Record<string, PlayerProjection> = {};
  for (const item of result.Items ?? []) {
    out[item.player_id as string] = item.projection as PlayerProjection;
  }
  return out;
}

export async function importProjections(projections: Record<string, PlayerProjection>): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const userId = session.user.id;

  const entries = Object.entries(projections);
  if (entries.length === 0) return;

  // DynamoDB BatchWrite max 25 items per request
  for (let i = 0; i < entries.length; i += 25) {
    const chunk = entries.slice(i, i + 25);
    await client.send(new BatchWriteCommand({
      RequestItems: {
        [TABLE]: chunk.map(([playerId, projection]) => ({
          PutRequest: {
            Item: {
              user_id: userId,
              player_id: playerId,
              projection,
              updated_at: new Date().toISOString(),
            },
          },
        })),
      },
    }));
  }
}
