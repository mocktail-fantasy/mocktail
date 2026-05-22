import type { SeasonStats, PlayerProjection } from '../types';

const EMPTY_PROJECTION: PlayerProjection = {
  passing_yards: 0,
  passing_tds: 0,
  interceptions: 0,
  receptions: 0,
  receiving_yards: 0,
  receiving_tds: 0,
  rushing_yards: 0,
  rushing_tds: 0,
  fumbles_lost: 0,
};

/**
 * Returns a projection pre-filled from FantasyPros data (if available) or
 * the player's most recent season stats. If minSeason is provided, returns
 * empty projection if the player's most recent season is older than minSeason.
 */
export function getDefaultProjection(seasons: SeasonStats[], fpProjection?: PlayerProjection, minSeason?: number): PlayerProjection {
  if (fpProjection) return fpProjection;
  return { ...EMPTY_PROJECTION };
}

/**
 * Returns the most recent season's pre-calculated fantasy_points value.
 * If minSeason is provided, returns 0 if the player's most recent season
 * is older than minSeason.
 */
export function getDefaultFantasyPoints(seasons: SeasonStats[], minSeason?: number): number {
  const latest = [...seasons].sort((a, b) => b.season - a.season)[0];
  if (!latest) return 0;
  if (minSeason !== undefined && latest.season < minSeason) return 0;
  return latest.fantasy_points ?? 0;
}
