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

export default function RosterGrid({
  players,
  defaultPoints,
  defaultProjections,
}: {
  players: Player[];
  defaultPoints: Record<string, number>;
  defaultProjections: Record<string, PlayerProjection>;
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-6 shrink-0 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Filter</span>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {POSITION_TABS.map((pos) => (
              <button
                key={pos}
                onClick={() => setActivePosition(pos)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activePosition === pos
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Ranking</span>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {(['points', 'vorp'] as RankingMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setRankingMode(mode)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  rankingMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {mode === 'points' ? 'Total Points' : 'Smart (VORP)'}
              </button>
            ))}
          </div>
        </div>
        <input
          type="text"
          placeholder="Search player…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none sm:w-56"
        />
      </div>

      <p className="mb-4 shrink-0 text-xs text-gray-500">
        {ranked.length} player{ranked.length !== 1 ? 's' : ''}
      </p>

      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-gray-200 shadow-sm">
        <div className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 grid grid-cols-[32px_minmax(0,1fr)_80px_16px] items-center gap-3 rounded-t-xl border-b border-gray-200 bg-gray-50 px-4 py-2 sm:hidden">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">#</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Player</span>
            <span className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Proj Pts</span>
            <span />
          </div>
          <div className="sticky top-0 z-10 hidden grid-cols-[32px_minmax(0,1fr)_52px_80px_44px_minmax(0,2fr)_88px_16px] items-center gap-4 rounded-t-xl border-b border-gray-200 bg-gray-50 px-4 py-2 sm:grid">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">#</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Player</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Team</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Pos</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Age</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Proj Stats</span>
            <span className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Proj Pts</span>
            <span />
          </div>
          <div className="divide-y divide-gray-100">
            {ranked.map((player, i) => (
              <PlayerCard
                key={player.player_id}
                player={player}
                rank={i + 1}
                projectedPoints={projectedPoints[player.player_id]}
                pointsUnit="pts"
                projection={projections[player.player_id] ?? EMPTY_PROJECTION}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
