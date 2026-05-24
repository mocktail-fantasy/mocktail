'use server';

import { requireUserId } from '@/lib/auth-helpers';
import * as store from '@/lib/rankings-store';
import type { RankingConfig } from '@mocktail/core';

export type RankingDraft = Omit<RankingConfig, 'id' | 'createdAt' | 'updatedAt'>;

export async function listRankings(): Promise<RankingConfig[]> {
  const userId = await requireUserId();
  if (!userId) return [];
  return store.listForUser(userId);
}

export async function createRanking(draft: RankingDraft): Promise<RankingConfig | null> {
  const userId = await requireUserId();
  if (!userId) return null;

  const now = new Date().toISOString();
  const config: RankingConfig = {
    ...draft,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await store.put(userId, config);
  return config;
}

export async function updateRanking(id: string, draft: RankingDraft): Promise<RankingConfig | null> {
  const userId = await requireUserId();
  if (!userId) return null;

  const prev = await store.getForUser(userId, id);
  if (!prev) return null;

  const config: RankingConfig = {
    ...draft,
    id,
    createdAt: prev.createdAt,
    updatedAt: new Date().toISOString(),
  };
  await store.put(userId, config);
  return config;
}

export async function deleteRanking(id: string): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;
  await store.remove(userId, id);
}
