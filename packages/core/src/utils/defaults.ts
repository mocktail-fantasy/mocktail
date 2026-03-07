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
 * Returns a projection pre-filled from a player's most recent season stats.
 * If minSeason is provided, returns empty projection if the player's most
 * recent season is older than minSeason.
 */
export function getDefaultProjection(seasons: SeasonStats[], minSeason?: number): PlayerProjection {
  const latest = [...seasons].sort((a, b) => b.season - a.season)[0];
  if (!latest) return { ...EMPTY_PROJECTION };
  if (minSeason !== undefined && latest.season < minSeason) return { ...EMPTY_PROJECTION };

  return {
    passing_yards: latest.passing?.yards ?? 0,
    passing_tds: latest.passing?.tds ?? 0,
    interceptions: latest.passing?.interceptions ?? 0,
    receptions: latest.receiving?.receptions ?? 0,
    receiving_yards: latest.receiving?.yards ?? 0,
    receiving_tds: latest.receiving?.tds ?? 0,
    rushing_yards: latest.rushing?.yards ?? 0,
    rushing_tds: latest.rushing?.tds ?? 0,
    fumbles_lost: latest.fumbles_lost,
  };
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
