import type { PlayerProjection, ScoringSettings, Position } from '../types';

export const DEFAULT_SCORING: ScoringSettings = {
  scoringType: 'standard',
  tep: false,
  sixPointPassTDs: false,
};

export function calculateFantasyPoints(
  projection: PlayerProjection,
  positions: Position[],
  settings: ScoringSettings = DEFAULT_SCORING,
): number {
  let points = 0;

  const passTDValue = settings.sixPointPassTDs ? 6 : 4;
  const receptionBonus =
    settings.scoringType === 'ppr' ? 1 : settings.scoringType === 'half_ppr' ? 0.5 : 0;
  const tepBonus = positions.includes('TE') && settings.tep ? 0.5 : 0;

  points += projection.passing_tds * passTDValue;
  points += projection.passing_yards * 0.04;
  points += projection.interceptions * -2;

  points += projection.receptions * (receptionBonus + tepBonus);
  points += projection.receiving_tds * 6;
  points += projection.receiving_yards * 0.1;

  points += projection.rushing_tds * 6;
  points += projection.rushing_yards * 0.1;

  points += projection.fumbles_lost * -2;

  return Math.round(points * 100) / 100;
}
