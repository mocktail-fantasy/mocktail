import type { Player, Position } from '../types';

export const REPLACEMENT_RANKS: Record<Position, number> = {
  QB: 12,
  RB: 40,
  WR: 50,
  TE: 12,
};

const POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE'];

export function calculateVORPBaselines(
  players: Player[],
  projectedPoints: Record<string, number>,
  twoQB = false,
): Record<Position, number> {
  const baselines = {} as Record<Position, number>;
  for (const pos of POSITIONS) {
    const posPlayers = players
      .filter((p) => p.positions.includes(pos))
      .sort((a, b) => (projectedPoints[b.player_id] ?? 0) - (projectedPoints[a.player_id] ?? 0));
    const replacementIndex = pos === 'QB' && twoQB ? 32 : REPLACEMENT_RANKS[pos];
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
