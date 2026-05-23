import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { FANTASY_POSITIONS, getDefaultProjection, calculateFantasyPoints } from '@mocktail/core';
import type { Player, PlayerHistory, PlayerProjection, PlayerRanking, PlayerSummary, TeamSummary, TeamHistoryPlayer, Position, RankingContextEntry, ScoringSettings } from '@mocktail/core';
import { getFantasyPositions } from '@mocktail/core';

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

export async function getPlayerSummaries(): Promise<Record<string, PlayerSummary>> {
  return loadJson<Record<string, PlayerSummary>>('player_summaries.json').catch(() => ({}));
}

export async function getTeamSummaries(): Promise<Record<string, TeamSummary>> {
  return loadJson<Record<string, TeamSummary>>('team_summaries.json').catch(() => ({}));
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
