'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Player, PlayerProjection, Position } from '@mocktail/core';
import { getFantasyPositions, calculateFantasyPoints, calculateVORPBaselines, calculateVORP } from '@mocktail/core';
import PlayerCard from './PlayerCard';
import { useScoringType } from './ScoringContext';

type FilterPosition = Position | 'ALL';
type RankingMode = 'points' | 'vorp' | 'adp' | 'ecr';
type EcrEntry = { rank: number; posRank: string };

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
  adpMap,
  ecrMap,
}: {
  players: Player[];
  defaultPoints: Record<string, number>;
  defaultProjections: Record<string, PlayerProjection>;
  newsPlayerIds?: Set<string>;
  adpMap?: Record<string, number>;
  ecrMap?: Record<string, Record<string, EcrEntry>>;
}) {
  const { scoringType, scoringSettings, twoQB, tep } = useScoringType();
  const showAdp = !twoQB && !tep;

  // Map scoring context to the correct ECR format key
  const ecrFormat = useMemo(() => {
    const base = scoringType === 'half_ppr' ? 'half_ppr' : scoringType === 'ppr' ? 'ppr' : 'std';
    return twoQB ? `sf_${base}` : base;
  }, [scoringType, twoQB]);

  const getEcr = (playerId: string): EcrEntry | undefined => ecrMap?.[playerId]?.[ecrFormat];
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

  const vorpRankMap = useMemo(() => {
    const sorted = [...players].sort(
      (a, b) => (vorpScores[b.player_id] ?? -999) - (vorpScores[a.player_id] ?? -999),
    );
    const map: Record<string, number> = {};
    sorted.forEach((p, i) => { map[p.player_id] = i + 1; });
    return map;
  }, [players, vorpScores]);

  // Fall back from ADP if hidden, from VORP if position-filtered
  const effectiveMode: RankingMode =
    rankingMode === 'adp' && !showAdp ? 'vorp'
    : rankingMode === 'vorp' && activePosition !== 'ALL' ? 'points'
    : rankingMode;

  const ranked = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (effectiveMode === 'adp') {
        const aAdp = adpMap?.[a.player_id] ?? 9999;
        const bAdp = adpMap?.[b.player_id] ?? 9999;
        return aAdp - bAdp;
      }
      if (effectiveMode === 'ecr') {
        const aEcr = getEcr(a.player_id)?.rank ?? 9999;
        const bEcr = getEcr(b.player_id)?.rank ?? 9999;
        return aEcr - bEcr;
      }
      const val = (id: string) =>
        effectiveMode === 'vorp'
          ? (vorpScores[id] ?? -999)
          : (projectedPoints[id] ?? -1);
      return val(b.player_id) - val(a.player_id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, projectedPoints, vorpScores, adpMap, ecrFormat, effectiveMode]);

  const gridCols = showAdp
    ? 'grid-cols-[40px_minmax(0,1fr)_56px_88px_16px] sm:grid-cols-[40px_minmax(0,1fr)_minmax(0,2fr)_56px_56px_88px_16px]'
    : 'grid-cols-[40px_minmax(0,1fr)_88px_16px] sm:grid-cols-[40px_minmax(0,1fr)_minmax(0,2fr)_56px_88px_16px]';

  const headerBtnStyle = (mode: RankingMode): React.CSSProperties => ({
    ...labelStyle,
    textAlign: 'right' as const,
    cursor: 'pointer',
    color: effectiveMode === mode ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
    transition: 'color 0.15s',
    background: 'none',
    border: 'none',
    padding: 0,
    margin: 0,
    fontFamily: 'inherit',
  });

  return (
    <div className="flex flex-col">
      {/* Filter bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
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

        {/* Ranking strategy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={labelStyle}>Ranking</span>
          <select
            value="vorp"
            onChange={() => setRankingMode('vorp')}
            style={{
              ...chipBase,
              border: '0.5px solid var(--color-border-medium)',
              background: 'var(--color-bg-primary)',
              color: 'var(--color-text-secondary)',
              outline: 'none',
              appearance: 'none',
              WebkitAppearance: 'none',
              paddingRight: '28px',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239A9992' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 8px center',
            }}
          >
            <option value="vorp">VORP</option>
          </select>
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

      {/* Result count + attribution */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {ranked.length} player{ranked.length !== 1 ? 's' : ''}
        </p>
        <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
          Rankings data via FantasyPros (fantasypros.com)
        </span>
      </div>

      {/* Table */}
      <div className="card">
        {/* Column headers */}
        <div className={`grid ${gridCols} items-center gap-3 sm:gap-4 px-4 py-2`}
          style={{
            borderBottom: '0.5px solid var(--color-border-light)',
            background: 'var(--color-bg-secondary)',
            borderRadius: '10px 10px 0 0',
          }}
        >
          <button onClick={() => setRankingMode('vorp')} style={headerBtnStyle('vorp')}>
              RK {effectiveMode === 'vorp' ? '▼' : ''}
            </button>
          <span style={labelStyle}>Player</span>
          <span className="hidden sm:block" style={labelStyle}>Projected stats</span>
          <button className="hidden sm:block" onClick={() => setRankingMode(effectiveMode === 'ecr' ? 'vorp' : 'ecr')} style={headerBtnStyle('ecr')} title="Expert Consensus Ranking">
            ECR {effectiveMode === 'ecr' ? '▲' : ''}
          </button>
          {showAdp && (
            <button onClick={() => setRankingMode(effectiveMode === 'adp' ? 'vorp' : 'adp')} style={headerBtnStyle('adp')} title="Average Draft Position">
              ADP {effectiveMode === 'adp' ? '▲' : ''}
            </button>
          )}
          <button onClick={() => setRankingMode(effectiveMode === 'points' ? 'vorp' : 'points')} style={headerBtnStyle('points')}>
            PTS {effectiveMode === 'points' ? '▼' : ''}
          </button>
          <span />
        </div>

        {/* Rows */}
        <div>
          {ranked.map((player, i) => (
            <div key={player.player_id} style={{ borderTop: i > 0 ? '0.5px solid var(--color-border-light)' : 'none' }}>
              <PlayerCard
                player={player}
                rank={vorpRankMap[player.player_id] ?? i + 1}
                projectedPoints={projectedPoints[player.player_id]}
                pointsUnit="pts"
                projection={projections[player.player_id] ?? EMPTY_PROJECTION}
                hasNews={newsPlayerIds?.has(player.player_id)}
                adp={showAdp ? adpMap?.[player.player_id] : undefined}
                showAdp={showAdp}
                ecr={getEcr(player.player_id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
