'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Player, PlayerProjection, Position } from '@mocktail/core';
import { getFantasyPositions, calculateFantasyPoints, getDefaultProjection, calculateVORPBaselines, calculateVORP } from '@mocktail/core';
import PlayerCard from './PlayerCard';
import { useScoringType } from './ScoringContext';

type FilterPosition = Position | 'ALL';
type RankingMode = 'points' | 'vorp';

const POSITION_TABS: FilterPosition[] = ['ALL', 'QB', 'RB', 'WR', 'TE'];

const EMPTY_PROJECTION: PlayerProjection = {
  passing_yards: 0, passing_tds: 0, interceptions: 0,
  receptions: 0, receiving_yards: 0, receiving_tds: 0,
  rushing_yards: 0, rushing_tds: 0, fumbles_lost: 0,
};

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--color-text-tertiary)',
  whiteSpace: 'nowrap',
};

const chipBase: React.CSSProperties = {
  padding: '5px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s',
};

export default function RosterGrid({
  players,
  defaultPoints,
  defaultProjections,
  newsPlayerIds,
}: {
  players: Player[];
  defaultPoints: Record<string, number>;
  defaultProjections: Record<string, PlayerProjection>;
  newsPlayerIds?: Set<string>;
}) {
  const { scoringSettings, twoQB } = useScoringType();
  const [activePosition, setActivePosition] = useState<FilterPosition>('ALL');
  const [rankingMode, setRankingMode] = useState<RankingMode>('vorp');
  const [search, setSearch] = useState('');
  const [projectedPoints, setProjectedPoints] = useState<Record<string, number>>(defaultPoints);
  const [projections, setProjections] = useState<Record<string, PlayerProjection>>(defaultProjections);

  useEffect(() => {
    const mergedProjections = { ...defaultProjections };
    for (const player of players) {
      const saved = localStorage.getItem(`projection_${player.player_id}`);
      if (saved) {
        try {
          mergedProjections[player.player_id] = JSON.parse(saved) as PlayerProjection;
        } catch {
          // ignore malformed entries
        }
      }
    }
    const mergedPoints: Record<string, number> = {};
    for (const player of players) {
      const projection = mergedProjections[player.player_id];
      if (projection) {
        const positions = getFantasyPositions(player.positions);
        mergedPoints[player.player_id] = calculateFantasyPoints(projection, positions, scoringSettings);
      }
    }
    setProjectedPoints(mergedPoints);
    setProjections(mergedProjections);
  }, [players, defaultProjections, scoringSettings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return players.filter((p) => {
      const matchesPosition = activePosition === 'ALL' || p.positions.includes(activePosition);
      const matchesSearch =
        q === '' || p.player_name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q);
      return matchesPosition && matchesSearch;
    });
  }, [players, activePosition, search]);

  const vorpBaselines = useMemo(
    () => calculateVORPBaselines(players, projectedPoints, twoQB),
    [players, projectedPoints, twoQB],
  );

  const vorpScores = useMemo(() => {
    const scores: Record<string, number> = {};
    for (const player of players) {
      const pos = getFantasyPositions(player.positions)[0];
      if (pos) {
        scores[player.player_id] = calculateVORP(
          projectedPoints[player.player_id] ?? 0,
          pos,
          vorpBaselines,
        );
      }
    }
    return scores;
  }, [players, projectedPoints, vorpBaselines]);

  const effectiveMode: RankingMode =
    rankingMode === 'vorp' && activePosition === 'ALL' ? 'vorp' : 'points';

  const ranked = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const val = (id: string) =>
        effectiveMode === 'vorp'
          ? (vorpScores[id] ?? -999)
          : (projectedPoints[id] ?? -1);
      return val(b.player_id) - val(a.player_id);
    });
  }, [filtered, projectedPoints, vorpScores, effectiveMode]);

  return (
    <div className="flex flex-col sm:min-h-0 sm:flex-1">
      {/* Filter bar */}
      <div className="mb-4 shrink-0 flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
        {/* Position filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={labelStyle}>Filter</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {POSITION_TABS.map((pos) => {
              const isActive = activePosition === pos;
              return (
                <button
                  key={pos}
                  onClick={() => setActivePosition(pos)}
                  style={{
                    ...chipBase,
                    border: isActive ? '0.5px solid var(--color-text-primary)' : '0.5px solid var(--color-border-medium)',
                    background: isActive ? 'var(--color-text-primary)' : 'transparent',
                    color: isActive ? 'var(--color-bg-tertiary)' : 'var(--color-text-secondary)',
                  }}
                >
                  {pos}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ranking mode */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={labelStyle}>Ranking</span>
          <div style={{
            display: 'flex',
            border: '0.5px solid var(--color-border-medium)',
            borderRadius: '6px',
            overflow: 'hidden',
          }}>
            {(['points', 'vorp'] as RankingMode[]).map((mode, i) => {
              const isActive = rankingMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setRankingMode(mode)}
                  style={{
                    padding: '5px 10px',
                    fontSize: '12px',
                    fontWeight: 500,
                    border: 'none',
                    borderRight: i === 0 ? '0.5px solid var(--color-border-medium)' : 'none',
                    cursor: 'pointer',
                    background: isActive ? 'var(--color-text-primary)' : 'transparent',
                    color: isActive ? 'var(--color-bg-tertiary)' : 'var(--color-text-secondary)',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  {mode === 'points' ? 'Total Points' : 'Smart (VORP)'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search player…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-medium)'; }}
          className="w-full sm:w-auto sm:ml-auto"
          style={{
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            border: '0.5px solid var(--color-border-medium)',
            background: 'var(--color-bg-primary)',
            color: 'var(--color-text-primary)',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 0.15s',
            minWidth: '180px',
          }}
        />
      </div>

      {/* Result count */}
      <p className="mb-3 shrink-0 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        {ranked.length} player{ranked.length !== 1 ? 's' : ''}
      </p>

      {/* Table */}
      <div className="card sm:flex sm:min-h-0 sm:flex-1 sm:flex-col">
        <div className="sm:flex-1 sm:overflow-y-auto">
          {/* Column headers */}
          <div className="grid grid-cols-[40px_minmax(0,1fr)_88px_16px] sm:grid-cols-[40px_minmax(0,1fr)_minmax(0,2fr)_88px_16px] items-center gap-3 sm:gap-4 px-4 py-2 sticky top-0 z-10"
            style={{
              borderBottom: '0.5px solid var(--color-border-light)',
              background: 'var(--color-bg-secondary)',
              borderRadius: '10px 10px 0 0',
            }}
          >
            <span style={{ ...labelStyle, textAlign: 'right' }}>#</span>
            <span style={labelStyle}>Player</span>
            <span className="hidden sm:block" style={labelStyle}>Projected stats</span>
            <span style={{ ...labelStyle, textAlign: 'right' }}>Proj pts</span>
            <span />
          </div>

          {/* Rows */}
          <div style={{ borderTop: 'none' }}>
            {ranked.map((player, i) => (
              <div key={player.player_id} style={{ borderTop: i > 0 ? '0.5px solid var(--color-border-light)' : 'none' }}>
                <PlayerCard
                  player={player}
                  rank={i + 1}
                  projectedPoints={projectedPoints[player.player_id]}
                  pointsUnit="pts"
                  projection={projections[player.player_id] ?? EMPTY_PROJECTION}
                  hasNews={newsPlayerIds?.has(player.player_id)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
