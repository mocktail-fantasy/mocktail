'use client';

import type { SeasonStats, ScoringType } from '@mocktail/core';
import { useScoringType } from '@/app/_components/ScoringContext';

function getLastSeason(seasons: SeasonStats[]): SeasonStats | null {
  return [...seasons].sort((a, b) => b.season - a.season)[0] ?? null;
}

function getPts(s: SeasonStats, scoringType: ScoringType): number {
  if (scoringType === 'ppr') return s.fantasy_points_ppr;
  if (scoringType === 'half_ppr') return (s.fantasy_points + s.fantasy_points_ppr) / 2;
  return s.fantasy_points;
}

export default function LastSeasonPts({ seasons }: { seasons: SeasonStats[] }) {
  const { scoringType } = useScoringType();
  const latest = getLastSeason(seasons);
  if (!latest) return null;

  const pts = getPts(latest, scoringType);

  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{
        fontSize: '28px',
        fontWeight: 500,
        color: 'var(--color-brand)',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
      }}>
        {pts.toFixed(1)}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '3px' }}>
        {latest.season} pts
      </div>
    </div>
  );
}
