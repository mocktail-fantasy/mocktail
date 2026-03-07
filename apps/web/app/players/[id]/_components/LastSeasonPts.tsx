'use client';

import type { SeasonStats, ScoringType } from '@mocktail/core';
import { useScoringType } from '@/app/_components/ScoringContext';

function getLastSeasonPts(seasons: SeasonStats[], scoringType: ScoringType): number {
  const latest = [...seasons].sort((a, b) => b.season - a.season)[0];
  if (!latest) return 0;
  if (scoringType === 'ppr') return latest.fantasy_points_ppr;
  if (scoringType === 'half_ppr') return (latest.fantasy_points + latest.fantasy_points_ppr) / 2;
  return latest.fantasy_points;
}

export default function LastSeasonPts({ seasons }: { seasons: SeasonStats[] }) {
  const { scoringType } = useScoringType();
  const pts = getLastSeasonPts(seasons, scoringType);
  return (
    <div className="flex items-baseline gap-1 pr-4">
      <span className="text-base font-bold tabular-nums text-orange-500">{pts.toFixed(1)}</span>
      <span className="text-[11px] text-gray-400">pts last season</span>
    </div>
  );
}
