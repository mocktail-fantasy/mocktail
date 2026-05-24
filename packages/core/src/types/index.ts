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

/**
 * A single news item from the FantasyPros /news endpoint.
 * `player_id` is the FP integer id; map via rankings.json to get gsis_id.
 * `team_id` is FP's team abbr — may need normalization (LAR→LA, JAC→JAX).
 */
export interface NewsItem {
  id: number;
  created: string;        // "YYYY-MM-DD HH:MM:SS" UTC
  author: string;
  player_id: number;      // FP player id
  team_id: string;        // FP team abbr
  title: string;
  categories: string[];   // e.g. ["Commentary", "News", "Injury", "Breaking"]
  link: string;
  desc: string;           // what happened
  impact: string;         // fantasy implication
}

export interface NewsFile {
  generated_at: string;
  items: NewsItem[];
}

export interface RankingFormat {
  rank_ecr: number;
  rank_min: string;
  rank_max: string;
  rank_ave: string;
  rank_std: string;
  pos_rank: string;
  tier: number;
}

export interface PlayerRanking {
  fp_id: number;
  player_name: string;
  player_team_id: string;
  player_position_id: string;
  rankings: Partial<Record<'std' | 'half_ppr' | 'ppr' | 'sf_std' | 'sf_half_ppr' | 'sf_ppr', RankingFormat>>;
  adp: number | null;
}

export interface RankingContextEntry {
  player_id: string;
  positions: string[];
  projection: PlayerProjection;
}

export type ScoringType = 'standard' | 'half_ppr' | 'ppr';

export interface ScoringSettings {
  scoringType: ScoringType;
  tep: boolean;
  sixPointPassTDs: boolean;
}

export type QBBehavior = 'normal' | 'early' | 'heavy' | 'early_and_heavy';
export type SkillBehavior = 'normal' | 'rb_heavy' | 'zero_rb';
export type RankingFormatType = 'redraft_managed' | 'best_ball';
export type BaselineMode = 'VOLS' | 'VORP_DEEP';

export interface RankingRoster {
  qbStarters: number;
  rbStarters: number;
  wrStarters: number;
  teStarters: number;
  flexSlots: number;
  superflexSlots: number;
  benchSize: number;
}

export interface RankingConfig {
  id: string;
  name: string;
  format: RankingFormatType;
  scoring: ScoringSettings;
  roster: RankingRoster;
  teams: number;
  qbBehavior: QBBehavior;
  skillBehavior: SkillBehavior;
  createdAt: string;
  updatedAt: string;
}

export interface PositionBaselines {
  mode: BaselineMode;
  depths: Record<Position, number>;
  values: Record<Position, number>;
}
