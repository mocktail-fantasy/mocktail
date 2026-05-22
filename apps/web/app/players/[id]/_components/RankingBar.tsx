'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Position, PlayerProjection, RankingContextEntry } from '@mocktail/core';
import { calculateFantasyPoints, calculateVORPBaselines, calculateVORP } from '@mocktail/core';
import { useScoringType } from '@/app/_components/ScoringContext';

export default function RankingBar({
  playerId,
  positions,
  rankingContext,
  playerEcr,
  playerAdp,
}: {
  playerId: string;
  positions: Position[];
  rankingContext: RankingContextEntry[];
  playerEcr?: Record<string, { rank: number; posRank: string }>;
  playerAdp?: number;
}) {
  const { scoringType, scoringSettings, twoQB } = useScoringType();
  const [livePoints, setLivePoints] = useState<number | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.playerId === playerId) setLivePoints(detail.points);
    };
    window.addEventListener('projectionchange', handler);
    return () => window.removeEventListener('projectionchange', handler);
  }, [playerId]);

  const allProjectedPoints = useMemo(() => {
    const points: Record<string, number> = {};
    for (const entry of rankingContext) {
      if (entry.player_id === playerId && livePoints != null) {
        points[entry.player_id] = livePoints;
      } else {
        let proj = entry.projection;
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem(`projection_${entry.player_id}`);
          if (saved) {
            try { proj = JSON.parse(saved) as PlayerProjection; } catch { /* keep default */ }
          }
        }
        points[entry.player_id] = calculateFantasyPoints(proj, entry.positions as Position[], scoringSettings);
      }
    }
    return points;
  }, [rankingContext, playerId, livePoints, scoringSettings]);

  const vorpBaselines = useMemo(
    () => calculateVORPBaselines(rankingContext, allProjectedPoints, twoQB),
    [rankingContext, allProjectedPoints, twoQB],
  );

  const rankInfo = useMemo(() => {
    const primaryPos = positions[0];
    const scores = rankingContext.map((entry) => ({
      id: entry.player_id,
      position: (entry.positions as Position[])[0],
      vorp: calculateVORP(
        allProjectedPoints[entry.player_id] ?? 0,
        (entry.positions as Position[])[0] ?? 'QB',
        vorpBaselines,
      ),
    }));
    scores.sort((a, b) => b.vorp - a.vorp);
    const overallRank = scores.findIndex((s) => s.id === playerId) + 1;
    const posScores = scores.filter((s) => s.position === primaryPos);
    const posRank = posScores.findIndex((s) => s.id === playerId) + 1;
    return {
      overall: overallRank > 0 ? overallRank : null,
      posRank: posRank > 0 ? `${primaryPos}${posRank}` : null,
    };
  }, [rankingContext, allProjectedPoints, vorpBaselines, playerId, positions]);

  const ecrFormat = useMemo(() => {
    const base = scoringType === 'half_ppr' ? 'half_ppr' : scoringType === 'ppr' ? 'ppr' : 'std';
    return twoQB ? `sf_${base}` : base;
  }, [scoringType, twoQB]);

  const ecr = playerEcr?.[ecrFormat];
  const hasData = rankInfo.overall != null || ecr || playerAdp != null;
  if (!hasData) return null;

  return (
    <div style={{
      padding: '10px 20px',
      borderTop: '0.5px solid var(--color-border-light)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap',
    }}>
      {rankInfo.overall != null && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-text-tertiary)',
          }}>
            Rank
          </span>
          <span style={{
            fontSize: '14px',
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--color-brand)',
          }}>
            #{rankInfo.overall}
          </span>
          {rankInfo.posRank && (
            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
              ({rankInfo.posRank})
            </span>
          )}
        </div>
      )}

      {ecr && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-text-tertiary)',
          }}>
            ECR
          </span>
          <span style={{
            fontSize: '14px',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--color-text-secondary)',
          }}>
            #{ecr.rank}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
            ({ecr.posRank})
          </span>
        </div>
      )}

      {playerAdp != null && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-text-tertiary)',
          }}>
            ADP
          </span>
          <span style={{
            fontSize: '14px',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--color-text-secondary)',
          }}>
            {playerAdp}
          </span>
        </div>
      )}
    </div>
  );
}
