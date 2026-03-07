export type Position = 'QB' | 'RB' | 'WR' | 'TE';

export const FANTASY_POSITIONS = new Set<Position>(['QB', 'RB', 'WR', 'TE']);

/** Filters a raw positions array down to only fantasy-relevant positions. */
export function getFantasyPositions(positions: string[]): Position[] {
  return positions.filter((p): p is Position => FANTASY_POSITIONS.has(p as Position));
}

export interface Player {
  player_id: string;
  player_name: string;
  team: string;
  positions: string[];
  age: number;
  headshot: string;
}

export interface PassingStats {
  tds: number;
  yards: number;
  attempts: number;
  completions: number;
  interceptions: number;
}

export interface RushingStats {
  tds: number;
  yards: number;
  attempts: number;
}

export interface ReceivingStats {
  tds: number;
  yards: number;
  targets: number;
  receptions: number;
}

export interface SeasonStats {
  season: number;
  games_played: number;
  fantasy_points: number;
  fantasy_points_ppr: number;
  fumbles_lost: number;
  passing?: PassingStats;
  rushing?: RushingStats;
  receiving?: ReceivingStats;
}

export interface PlayerAggregate {
  games_played: number;
  fantasy_points: number;
  fantasy_points_ppr: number;
  fumbles: number;
  fumbles_lost: number;
  passing: { average_completion_percentage: number; yards: number; tds: number; interceptions: number };
  rushing: { attempts: number; yards: number; tds: number };
  receiving: { receptions: number; targets: number; yards: number; tds: number };
}

export interface PlayerHistory {
  player_id: string;
  player_name: string;
  team: string;
  positions: string[];
  aggregate: PlayerAggregate;
  seasons: SeasonStats[];
}

export interface PlayerProjection {
  passing_yards: number;
  passing_tds: number;
  interceptions: number;
  receptions: number;
  receiving_yards: number;
  receiving_tds: number;
  rushing_yards: number;
  rushing_tds: number;
  fumbles_lost: number;
}

export interface UserProjection {
  player_id: string;
  projection: PlayerProjection;
  fantasy_points: number;
}

export interface TeamHistoryPlayer {
  player_id: string;
  player_name: string;
  positions: string[];
  age: number | null;
  headshot: string | null;
  games_played: number;
  fantasy_points: number;
  passing_attempts: number;
  passing_yards: number;
  passing_tds: number;
  interceptions: number;
  rushing_yards: number;
  rushing_tds: number;
  receptions: number;
  receiving_yards: number;
  receiving_tds: number;
  fumbles_lost: number;
}

export type ScoringType = 'standard' | 'half_ppr' | 'ppr';

export interface ScoringSettings {
  scoringType: ScoringType;
  tep: boolean;
  sixPointPassTDs: boolean;
}
