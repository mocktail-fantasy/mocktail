import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { FANTASY_POSITIONS, getDefaultFantasyPoints, getDefaultProjection } from '@mocktail/core';
import type { Player, PlayerHistory, PlayerProjection, TeamHistoryPlayer, Position } from '@mocktail/core';

export function currentNFLSeason(): number {
  const today = new Date();
  const year = today.getFullYear();
  const sep1 = new Date(year, 8, 1);
  const laborDayOffset = (1 - sep1.getDay() + 7) % 7;
  const firstSunday = new Date(sep1.getTime() + (laborDayOffset + 6) * 86400000);
  return today >= firstSunday ? year : year - 1;
}

export function getRosters(): Player[] {
  const filePath = path.join(process.cwd(), 'public', 'active_rosters.json');
  const all: Player[] = JSON.parse(readFileSync(filePath, 'utf-8'));
  return all.filter((p) => p.positions.some((pos) => FANTASY_POSITIONS.has(pos as Position)));
}

export function getPlayer(playerId: string): Player | null {
  return getRosters().find((p) => p.player_id === playerId) ?? null;
}

export function getPlayerHistory(playerId: string): PlayerHistory | null {
  const filePath = path.join(process.cwd(), 'public', 'historical_data.json');
  const data: Record<string, PlayerHistory> = JSON.parse(readFileSync(filePath, 'utf-8'));
  return data[playerId] ?? null;
}

export function getAllDefaultProjections(): Record<string, PlayerProjection> {
  const filePath = path.join(process.cwd(), 'public', 'historical_data.json');
  const data: Record<string, PlayerHistory> = JSON.parse(readFileSync(filePath, 'utf-8'));
  const minSeason = currentNFLSeason();
  const result: Record<string, PlayerProjection> = {};
  for (const [playerId, history] of Object.entries(data)) {
    result[playerId] = getDefaultProjection(history.seasons, minSeason);
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

export function getTeamsData(): Record<string, TeamInfo> {
  const filePath = path.join(process.cwd(), 'public', 'teams.json');
  if (!existsSync(filePath)) return {};
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

export function getTeamHistory(): Record<string, TeamHistoryPlayer[]> {
  const filePath = path.join(process.cwd(), 'public', 'team_history.json');
  if (!existsSync(filePath)) return {};
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

export function getAllDefaultPoints(): Record<string, number> {
  const filePath = path.join(process.cwd(), 'public', 'historical_data.json');
  const data: Record<string, PlayerHistory> = JSON.parse(readFileSync(filePath, 'utf-8'));
  const minSeason = currentNFLSeason();
  const result: Record<string, number> = {};
  for (const [playerId, history] of Object.entries(data)) {
    result[playerId] = getDefaultFantasyPoints(history.seasons, minSeason);
  }
  return result;
}
