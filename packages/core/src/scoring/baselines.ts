import type {
  BaselineMode,
  Position,
  PositionBaselines,
  QBBehavior,
  RankingConfig,
  SkillBehavior,
} from '../types';

export interface BaselinePlayer {
  player_id: string;
  positions: string[];
}

const POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE'];

// Standard W/R/T flex usage by position (research doc, §4 Input Sensitivity).
const FLEX_SPLIT: Record<Exclude<Position, 'QB'>, number> = { RB: 0.55, WR: 0.40, TE: 0.05 };

// ~95% of SF slots filled by QB; small share to skill positions.
const SUPERFLEX_SPLIT: Record<Position, number> = { QB: 0.85, RB: 0.07, WR: 0.06, TE: 0.02 };

// Two axes; offsets sum. Captures compound behaviors a single preset can't:
// "QB-Early + Heavy" league = elites gone (don't reach) AND backups hoarded
// (mid-tier QBs scarce). Net +2 elevates mid-tier QBs without overrating elites
// the user can't actually get.
const QB_BEHAVIOR_OFFSETS: Record<QBBehavior, Partial<Record<Position, number>>> = {
  normal:          {},
  early:           { QB: -6 },
  heavy:           { QB: +8 },
  early_and_heavy: { QB: +2 },
};

const SKILL_BEHAVIOR_OFFSETS: Record<SkillBehavior, Partial<Record<Position, number>>> = {
  normal:   {},
  rb_heavy: { RB: +6, WR: -2 },
  zero_rb:  { RB: -4, WR: +3 },
};

// bench ≤ 5 → VOLS, else BEER. v1 starting value; tune empirically with usage data.
const SHALLOW_BENCH_THRESHOLD = 5;

export function selectBaselineMode(config: RankingConfig): BaselineMode {
  if (config.format === 'best_ball') return 'VORP_DEEP';
  if (config.roster.benchSize <= SHALLOW_BENCH_THRESHOLD) return 'VOLS';
  return 'BEER';
}

export function computeBaselineDepths(
  config: RankingConfig,
  mode: BaselineMode,
): Record<Position, number> {
  const { teams, roster } = config;

  const starters: Record<Position, number> = {
    QB: teams * roster.qbStarters,
    RB: teams * roster.rbStarters,
    WR: teams * roster.wrStarters,
    TE: teams * roster.teStarters,
  };

  const flexDemand = teams * roster.flexSlots;
  starters.RB += flexDemand * FLEX_SPLIT.RB;
  starters.WR += flexDemand * FLEX_SPLIT.WR;
  starters.TE += flexDemand * FLEX_SPLIT.TE;

  const sfDemand = teams * roster.superflexSlots;
  for (const pos of POSITIONS) {
    starters[pos] += sfDemand * SUPERFLEX_SPLIT[pos];
  }

  const totalStarters = starters.QB + starters.RB + starters.WR + starters.TE;

  const depths: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
  for (const pos of POSITIONS) {
    if (mode === 'VOLS') {
      depths[pos] = starters[pos];
    } else if (mode === 'BEER') {
      const benchDemand = roster.benchSize * teams;
      depths[pos] = starters[pos] + benchDemand * (starters[pos] / totalStarters);
    } else {
      depths[pos] = starters[pos] + teams;
    }
  }

  for (const [pos, offset] of Object.entries(QB_BEHAVIOR_OFFSETS[config.qbBehavior])) {
    depths[pos as Position] += offset!;
  }
  for (const [pos, offset] of Object.entries(SKILL_BEHAVIOR_OFFSETS[config.skillBehavior])) {
    depths[pos as Position] += offset!;
  }

  return {
    QB: Math.max(1, Math.round(depths.QB)),
    RB: Math.max(1, Math.round(depths.RB)),
    WR: Math.max(1, Math.round(depths.WR)),
    TE: Math.max(1, Math.round(depths.TE)),
  };
}

export function calculateBaselines(
  players: BaselinePlayer[],
  projectedPoints: Record<string, number>,
  config: RankingConfig,
): PositionBaselines {
  const mode = selectBaselineMode(config);
  const depths = computeBaselineDepths(config, mode);
  const values: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };

  for (const pos of POSITIONS) {
    const posPlayers = players
      .filter((p) => p.positions.includes(pos))
      .sort((a, b) => (projectedPoints[b.player_id] ?? 0) - (projectedPoints[a.player_id] ?? 0));
    if (posPlayers.length === 0) {
      values[pos] = 0;
      continue;
    }
    const rankIndex = Math.min(depths[pos] - 1, posPlayers.length - 1);
    values[pos] = projectedPoints[posPlayers[rankIndex].player_id] ?? 0;
  }

  return { mode, depths, values };
}

export function calculateValueOverBaseline(
  playerPoints: number,
  position: Position,
  baselines: PositionBaselines,
): number {
  return playerPoints - baselines.values[position];
}
