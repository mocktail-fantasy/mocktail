import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { FANTASY_POSITIONS, getDefaultProjection, calculateFantasyPoints } from '@mocktail/core';
import type { Player, PlayerHistory, PlayerProjection, PlayerRanking, NewsItem, NewsFile, TeamHistoryPlayer, Position, RankingContextEntry, ScoringSettings } from '@mocktail/core';
import { getFantasyPositions } from '@mocktail/core';

// FP uses LAR/JAC; the app uses LA/JAX. Normalize when filtering news by team.
const FP_TEAM_MAP: Record<string, string> = { LAR: 'LA', JAC: 'JAX' };
function normalizeTeam(t: string): string {
  return FP_TEAM_MAP[t] ?? t;
}

async function loadJson<T>(filename: string): Promise<T> {
  const base = process.env.DATA_BASE_URL;
  if (base) {
    const res = await fetch(`${base}/${filename}`, { next: { revalidate: 3600 } });
    return res.json() as Promise<T>;
  }
  return JSON.parse(readFileSync(path.join(process.cwd(), 'public', filename), 'utf-8')) as T;
}

export function currentNFLSeason(): number {
  const today = new Date();
  const year = today.getFullYear();
  const sep1 = new Date(year, 8, 1);
  const laborDayOffset = (1 - sep1.getDay() + 7) % 7;
  const firstSunday = new Date(sep1.getTime() + (laborDayOffset + 6) * 86400000);
  return today >= firstSunday ? year : year - 1;
}

export async function getRosters(): Promise<Player[]> {
  const all = await loadJson<Player[]>('active_rosters.json');
  return all.filter((p) => p.positions.some((pos) => FANTASY_POSITIONS.has(pos as Position)));
}

export async function getPlayer(playerId: string): Promise<Player | null> {
  const rosters = await getRosters();
  return rosters.find((p) => p.player_id === playerId) ?? null;
}

export async function getPlayerHistory(playerId: string): Promise<PlayerHistory | null> {
  const data = await loadJson<Record<string, PlayerHistory>>('historical_data.json');
  return data[playerId] ?? null;
}

export async function getProjections(): Promise<Record<string, PlayerProjection>> {
  return loadJson<Record<string, PlayerProjection>>('projections.json').catch(() => ({}));
}

export async function getRankings(): Promise<Record<string, PlayerRanking>> {
  return loadJson<Record<string, PlayerRanking>>('rankings.json').catch(() => ({}));
}

export async function getAllDefaultProjections(): Promise<Record<string, PlayerProjection>> {
  const [rosters, fpProjections] = await Promise.all([getRosters(), getProjections()]);
  const result: Record<string, PlayerProjection> = {};
  for (const player of rosters) {
    result[player.player_id] = getDefaultProjection([], fpProjections[player.player_id]);
  }
  return result;
}

export type TeamInfo = {
  team_abbr: string;
  team_name: string | null;
  team_nick: string | null;
  team_conf: string | null;
  team_division: string | null;
  team_color: string | null;
  team_color2: string | null;
  team_color3: string | null;
  team_color4: string | null;
  team_logo_wikipedia: string | null;
  team_logo_espn: string | null;
  team_wordmark: string | null;
  team_conference_logo: string | null;
  team_league_logo: string | null;
  team_logo_squared: string | null;
};

export async function getTeamsData(): Promise<Record<string, TeamInfo>> {
  return loadJson<Record<string, TeamInfo>>('teams.json').catch(() => ({}));
}

export async function getTeamHistory(): Promise<Record<string, TeamHistoryPlayer[]>> {
  return loadJson<Record<string, TeamHistoryPlayer[]>>('team_history.json').catch(() => ({}));
}

/**
 * Returns all news items from news.json, sorted by `created` desc.
 * Empty array if the file is missing (graceful — staging/local envs may not have it yet).
 */
export async function getNews(): Promise<NewsItem[]> {
  const file = await loadJson<NewsFile>('news.json').catch(() => ({ generated_at: '', items: [] }));
  return [...file.items].sort((a, b) => b.created.localeCompare(a.created));
}

/**
 * Returns news items grouped by gsis player_id (the app's canonical id).
 * FP items reference players by FP integer id; we use rankings.json to reverse-map fp_id→gsis_id.
 * Items per player are sorted by `created` desc.
 */
export async function getNewsByPlayer(): Promise<Record<string, NewsItem[]>> {
  const [news, rankings] = await Promise.all([getNews(), getRankings()]);
  const fpToGsis = new Map<number, string>();
  for (const [gsisId, r] of Object.entries(rankings)) {
    fpToGsis.set(r.fp_id, gsisId);
  }
  const grouped: Record<string, NewsItem[]> = {};
  for (const item of news) {
    const gsisId = fpToGsis.get(item.player_id);
    if (!gsisId) continue;
    (grouped[gsisId] ??= []).push(item);
  }
  return grouped;
}

/**
 * Returns news items grouped by app team abbr. FP team_ids are normalized (LAR→LA, JAC→JAX).
 * Items per team are sorted by `created` desc.
 */
export async function getNewsByTeam(): Promise<Record<string, NewsItem[]>> {
  const news = await getNews();
  const grouped: Record<string, NewsItem[]> = {};
  for (const item of news) {
    const team = normalizeTeam(item.team_id);
    (grouped[team] ??= []).push(item);
  }
  return grouped;
}

export async function getNewsPlayerMap(): Promise<Record<number, { name: string; id: string }>> {
  const [rosters, rankings] = await Promise.all([getRosters(), getRankings()]);
  const nameById: Record<string, string> = {};
  for (const p of rosters) nameById[p.player_id] = p.player_name;
  const map: Record<number, { name: string; id: string }> = {};
  for (const [gsisId, r] of Object.entries(rankings)) {
    if (r.fp_id && nameById[gsisId]) map[r.fp_id] = { name: nameById[gsisId], id: gsisId };
  }
  return map;
}

export async function getRankingContext(): Promise<RankingContextEntry[]> {
  const [rosters, fpProjections] = await Promise.all([getRosters(), getProjections()]);
  return rosters.map((p) => ({
    player_id: p.player_id,
    positions: getFantasyPositions(p.positions),
    projection: getDefaultProjection([], fpProjections[p.player_id]),
  }));
}

const DEFAULT_SSR_SCORING: ScoringSettings = { scoringType: 'half_ppr', tep: false, sixPointPassTDs: false };

export async function getAllDefaultPoints(): Promise<Record<string, number>> {
  const [rosters, fpProjections] = await Promise.all([getRosters(), getProjections()]);
  const result: Record<string, number> = {};
  for (const player of rosters) {
    const projection = getDefaultProjection([], fpProjections[player.player_id]);
    const positions = getFantasyPositions(player.positions);
    result[player.player_id] = calculateFantasyPoints(projection, positions, DEFAULT_SSR_SCORING);
  }
  return result;
}
