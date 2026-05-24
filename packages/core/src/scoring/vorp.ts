import type { Position } from '../types';
import { calculateBaselines, type BaselinePlayer } from './baselines';

export type VORPPlayer = BaselinePlayer;

// Legacy hardcoded baselines preserved for the "Default" ranking on the rankings
// page (the no-survey, no-signup experience). Custom rankings go through
// `calculateBaselines` with a full RankingConfig instead.
export const REPLACEMENT_RANKS: Record<Position, number> = {
  QB: 12,
  RB: 40,
  WR: 50,
  TE: 12,
};

export function calculateVORPBaselines(
  players: VORPPlayer[],
  projectedPoints: Record<string, number>,
  twoQB = false,
): Record<Position, number> {
  const positions: Position[] = ['QB', 'RB', 'WR', 'TE'];
  const baselines = {} as Record<Position, number>;
  for (const pos of positions) {
    const posPlayers = players
      .filter((p) => p.positions.includes(pos))
      .sort((a, b) => (projectedPoints[b.player_id] ?? 0) - (projectedPoints[a.player_id] ?? 0));
    const replacementIndex = pos === 'QB' && twoQB ? 31 : REPLACEMENT_RANKS[pos];
    baselines[pos] = posPlayers[replacementIndex] != null
      ? (projectedPoints[posPlayers[replacementIndex].player_id] ?? 0)
      : 0;
  }
  return baselines;
}

export function calculateVORP(
  playerPoints: number,
  position: Position,
  baselines: Record<Position, number>,
): number {
  return playerPoints - baselines[position];
}

export { calculateBaselines, calculateValueOverBaseline, selectBaselineMode, computeBaselineDepths } from './baselines';
export type { BaselinePlayer } from './baselines';
