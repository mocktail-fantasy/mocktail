'use client';

import type { PlayerProjection, Position } from '@mocktail/core';
import { calculateFantasyPoints } from '@mocktail/core';
import { useScoringType } from '@/app/_components/ScoringContext';

export default function LastSeasonPts({
  projection,
  positions,
  season,
}: {
  projection: PlayerProjection;
  positions: Position[];
  season: number;
}) {
  const { scoringSettings } = useScoringType();
  const pts = calculateFantasyPoints(projection, positions, scoringSettings);

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
        {season} projection
      </div>
    </div>
  );
}
