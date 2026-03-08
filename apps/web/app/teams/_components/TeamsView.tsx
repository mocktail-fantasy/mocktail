'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Player, PlayerProjection, TeamHistoryPlayer } from '@mocktail/core';
import type { TeamInfo } from '@/lib/data';
import type { ScoringSettings } from '@mocktail/core';
import { getFantasyPositions, calculateFantasyPoints } from '@mocktail/core';
import { useScoringType } from '@/app/_components/ScoringContext';

const TEAM_COLORS: Record<string, { primary: string; onPrimary?: string }> = {
  ARI: { primary: '#97233F' },
  ATL: { primary: '#A71930' },
  BAL: { primary: '#241773' },
  BUF: { primary: '#00338D' },
  CAR: { primary: '#0085CA' },
  CHI: { primary: '#C83803' },
  CIN: { primary: '#FB4F14' },
  CLE: { primary: '#FF3C00' },
  DAL: { primary: '#003594' },
  DEN: { primary: '#FC4C02' },
  DET: { primary: '#0076B6' },
  GB:  { primary: '#203731' },
  HOU: { primary: '#03202F' },
  IND: { primary: '#002C5F' },
  JAX: { primary: '#D7A22A', onPrimary: '#101820' },
  KC:  { primary: '#E31837' },
  LA:  { primary: '#FFA300', onPrimary: '#1a1a1a' },
  LAC: { primary: '#0080C6' },
  LAR: { primary: '#FFA300', onPrimary: '#1a1a1a' },
  LV:  { primary: '#1a1a1a' },
  MIA: { primary: '#008E97' },
  MIN: { primary: '#4F2683' },
  NE:  { primary: '#002244' },
  NO:  { primary: '#9F8958', onPrimary: '#1a1a1a' },
  NYG: { primary: '#0B2265' },
  NYJ: { primary: '#125740' },
  PHI: { primary: '#004C54' },
  PIT: { primary: '#FFB612', onPrimary: '#1a1a1a' },
  SEA: { primary: '#69BE28' },
  SF:  { primary: '#AA0000' },
  TB:  { primary: '#D50A0A' },
  TEN: { primary: '#0C2340' },
  WAS: { primary: '#5A1414' },
};

// ── Historical inline map (same columns as PROJ_CONFIG) ───────────────────────

function calcHistPts(p: TeamHistoryPlayer, position: string, settings: ScoringSettings): number {
  const proj = {
    passing_yards: p.passing_yards, passing_tds: p.passing_tds, interceptions: p.interceptions,
    receptions: p.receptions, receiving_yards: p.receiving_yards, receiving_tds: p.receiving_tds,
    rushing_yards: p.rushing_yards, rushing_tds: p.rushing_tds, fumbles_lost: p.fumbles_lost,
  };
  return calculateFantasyPoints(proj, getFantasyPositions([position]), settings);
}

const HIST_PROJ_MAP: Record<string, (p: TeamHistoryPlayer) => (string | number)[]> = {
  QB: (p) => [p.passing_yards, p.passing_tds, p.interceptions, p.rushing_yards, p.rushing_tds],
  RB: (p) => [p.rushing_yards, p.rushing_tds, p.receptions, p.receiving_yards, p.receiving_tds],
  WR: (p) => [p.receptions, p.receiving_yards, p.receiving_tds, p.rushing_yards, p.rushing_tds],
  TE: (p) => [p.receptions, p.receiving_yards, p.receiving_tds, p.rushing_yards, p.rushing_tds],
};

// ── Projection config (PlayerProjection) ─────────────────────────────────────

type ProjConfig = {
  gridCols: string;
  headers: string[];
  getValues: (proj: PlayerProjection, pts: number) => (string | number)[];
};

const PROJ_CONFIG: Record<string, ProjConfig> = {
  QB: {
    gridCols: 'grid-cols-[2fr_0.7fr_1fr_1fr_1fr_1fr_1fr_1fr]',
    headers: ['Season', 'Pass Yds', 'Pass TDs', 'INTs', 'Rush Yds', 'Rush TDs', 'Proj Pts'],
    getValues: (p, pts) => [p.passing_yards, p.passing_tds, p.interceptions, p.rushing_yards, p.rushing_tds, pts],
  },
  RB: {
    gridCols: 'grid-cols-[2fr_0.7fr_1fr_1fr_1fr_1fr_1fr_1fr]',
    headers: ['Season', 'Rush Yds', 'Rush TDs', 'Rec', 'Rec Yds', 'Rec TDs', 'Pts'],
    getValues: (p, pts) => [p.rushing_yards, p.rushing_tds, p.receptions, p.receiving_yards, p.receiving_tds, pts],
  },
  WR: {
    gridCols: 'grid-cols-[2fr_0.7fr_1fr_1fr_1fr_1fr_1fr_1fr]',
    headers: ['Season', 'Rec', 'Rec Yds', 'Rec TDs', 'Rush Yds', 'Rush TDs', 'Pts'],
    getValues: (p, pts) => [p.receptions, p.receiving_yards, p.receiving_tds, p.rushing_yards, p.rushing_tds, pts],
  },
  TE: {
    gridCols: 'grid-cols-[2fr_0.7fr_1fr_1fr_1fr_1fr_1fr_1fr]',
    headers: ['Season', 'Rec', 'Rec Yds', 'Rec TDs', 'Rush Yds', 'Rush TDs', 'Pts'],
    getValues: (p, pts) => [p.receptions, p.receiving_yards, p.receiving_tds, p.rushing_yards, p.rushing_tds, pts],
  },
};

const EMPTY_PROJ: PlayerProjection = {
  passing_yards: 0, passing_tds: 0, interceptions: 0,
  receptions: 0, receiving_yards: 0, receiving_tds: 0,
  rushing_yards: 0, rushing_tds: 0, fumbles_lost: 0,
};

// ── TeamSummaryCard ───────────────────────────────────────────────────────────

function StatGroup({ label, stats }: {
  label: string;
  stats: { value: string | number; unit: string }[];
}) {
  return (
    <div className="flex flex-1 items-center gap-2.5 px-4 py-3">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
      <div className="flex items-baseline gap-1">
        {stats.map(({ value, unit }, i) => (
          <span key={unit} className="flex items-baseline gap-0.5">
            {i > 0 && <span className="mx-1 text-xs text-gray-200">·</span>}
            <span className="text-sm font-semibold tabular-nums text-gray-800">{value}</span>
            <span className="text-[11px] text-gray-400">{unit}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function TeamSummaryCard({ players, historySeason, activeTeam, teamPlayers, projections, teamInfo }: {
  players: TeamHistoryPlayer[];
  historySeason: number;
  activeTeam: string;
  teamPlayers: Player[];
  projections: Record<string, PlayerProjection>;
  teamInfo?: TeamInfo;
}) {
  const teamColor = teamInfo?.team_color ?? TEAM_COLORS[activeTeam]?.primary;

  function sumHist(fn: (p: TeamHistoryPlayer) => number) {
    return players.reduce((acc, p) => acc + fn(p), 0);
  }

  function sumProj(fn: (p: PlayerProjection) => number) {
    return teamPlayers.reduce((acc, p) => acc + fn(projections[p.player_id] ?? EMPTY_PROJ), 0);
  }

  const hist = {
    passYds: sumHist((p) => p.passing_yards),
    passTDs: sumHist((p) => p.passing_tds),
    ints:    sumHist((p) => p.interceptions),
    rushYds: sumHist((p) => p.rushing_yards),
    rushTDs: sumHist((p) => p.rushing_tds),
    rec:     sumHist((p) => p.receptions),
    recYds:  sumHist((p) => p.receiving_yards),
    recTDs:  sumHist((p) => p.receiving_tds),
  };

  const proj = {
    passYds: sumProj((p) => p.passing_yards),
    passTDs: sumProj((p) => p.passing_tds),
    ints:    sumProj((p) => p.interceptions),
    rushYds: sumProj((p) => p.rushing_yards),
    rushTDs: sumProj((p) => p.rushing_tds),
    rec:     sumProj((p) => p.receptions),
    recYds:  sumProj((p) => p.receiving_yards),
    recTDs:  sumProj((p) => p.receiving_tds),
  };

  const hasHist = hist.passYds > 0 || hist.rushYds > 0 || hist.recYds > 0;
  const hasProj = activeTeam !== 'FA' && (proj.passYds > 0 || proj.rushYds > 0 || proj.recYds > 0);

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Team header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        {teamInfo?.team_logo_espn && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={teamInfo.team_logo_espn}
            alt={teamInfo.team_name ?? activeTeam}
            className="h-12 w-12 shrink-0 object-contain"
          />
        )}
        <span
          className="text-2xl font-extrabold leading-tight tracking-tight"
          style={teamColor ? { color: teamColor } : { color: '#6b7280' }}
        >
          {teamInfo?.team_name ?? (activeTeam === 'FA' ? 'Free Agents' : activeTeam)}
        </span>
      </div>
      {/* 2026 projection row */}
      {hasProj && (
        <div className="hidden sm:flex sm:items-stretch sm:divide-x sm:divide-gray-100 border-t border-gray-100">
          <div className="flex w-28 shrink-0 items-center px-4 py-2.5">
            <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-gray-400">
              2026 Proj
            </span>
          </div>
          {proj.passYds > 0 && (
            <StatGroup
              label="QB Passing"
              stats={[
                { value: proj.passYds.toLocaleString(), unit: 'yds' },
                { value: proj.passTDs, unit: 'TD' },
                { value: proj.ints, unit: 'INT' },
              ]}
            />
          )}
          {proj.recYds > 0 && (
            <StatGroup
              label="Receiving"
              stats={[
                { value: proj.rec, unit: 'rec' },
                { value: proj.recYds.toLocaleString(), unit: 'yds' },
                { value: proj.recTDs, unit: 'TD' },
              ]}
            />
          )}
          {proj.rushYds > 0 && (
            <StatGroup
              label="Rushing"
              stats={[
                { value: proj.rushYds.toLocaleString(), unit: 'yds' },
                { value: proj.rushTDs, unit: 'TD' },
              ]}
            />
          )}
        </div>
      )}
      {/* Historical stats row */}
      {hasHist && (
        <div className="hidden sm:flex sm:items-stretch sm:divide-x sm:divide-gray-100 border-t border-gray-100">
          <div className="flex w-28 shrink-0 items-center px-4 py-2.5">
            <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {historySeason} Season
            </span>
          </div>
          {hist.passYds > 0 && (
            <StatGroup
              label="QB Passing"
              stats={[
                { value: hist.passYds.toLocaleString(), unit: 'yds' },
                { value: hist.passTDs, unit: 'TD' },
                { value: hist.ints, unit: 'INT' },
              ]}
            />
          )}
          {hist.recYds > 0 && (
            <StatGroup
              label="Receiving"
              stats={[
                { value: hist.rec, unit: 'rec' },
                { value: hist.recYds.toLocaleString(), unit: 'yds' },
                { value: hist.recTDs, unit: 'TD' },
              ]}
            />
          )}
          {hist.rushYds > 0 && (
            <StatGroup
              label="Rushing"
              stats={[
                { value: hist.rushYds.toLocaleString(), unit: 'yds' },
                { value: hist.rushTDs, unit: 'TD' },
              ]}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── ProjectionPlayerRow ───────────────────────────────────────────────────────

function ProjectionPlayerRow({ player, projection, projectedPoints, rank, position, activeTeam, historicalStats, historySeason, scoringSettings }: {
  player: Player;
  projection: PlayerProjection | undefined;
  projectedPoints: number | undefined;
  rank: number;
  position: string;
  activeTeam: string;
  historicalStats?: TeamHistoryPlayer;
  historySeason: number;
  scoringSettings: ScoringSettings;
}) {
  const config = PROJ_CONFIG[position] ?? PROJ_CONFIG.WR;
  const values = config.getValues(projection ?? EMPTY_PROJ, projectedPoints ?? 0);
  const histRows = historicalStats ? [{ season: historySeason, stats: historicalStats }] : [];

  return (
    <div>
      {/* Mobile row */}
      <Link
        href={`/players/${player.player_id}?from=teams&team=${activeTeam}`}
        className="group flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-gray-50 sm:hidden"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="w-5 shrink-0 text-right text-xs text-gray-400">{rank}</span>
          <span className="truncate text-sm font-medium text-gray-900 group-hover:text-gray-700">
            {player.player_name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 ml-2">
          <span className="text-sm font-semibold tabular-nums text-orange-500">
            {(projectedPoints ?? 0).toFixed(1)}
          </span>
          <span className="text-xs text-gray-400">proj pts</span>
          <svg className="h-4 w-4 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
      {/* Desktop row */}
      <Link
        href={`/players/${player.player_id}?from=teams&team=${activeTeam}`}
        className="group hidden items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50 sm:flex"
      >
        <div className={`grid ${config.gridCols} flex-1 items-center gap-2`}>
          <div className="flex min-w-0 items-center gap-2">
            <span className="w-5 shrink-0 text-right text-xs text-gray-400">{rank}</span>
            <span className="truncate text-sm font-medium text-gray-900 group-hover:text-gray-700">
              {player.player_name}
            </span>
          </div>
          <span className="text-left text-xs tabular-nums text-gray-500">2026</span>
          {values.map((v, i) => (
            <span
              key={i}
              className={`text-right text-xs tabular-nums ${i === values.length - 1 ? 'font-semibold text-orange-500' : 'text-gray-500'}`}
            >
              {typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(1)) : v}
            </span>
          ))}
        </div>
        <svg className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
      {histRows.map(({ season, stats }) => {
        const histStatValues = (HIST_PROJ_MAP[position] ?? HIST_PROJ_MAP.WR)(stats);
        const histPts = calcHistPts(stats, position, scoringSettings);
        return (
          <div key={season}>
            {/* Mobile history row */}
            <div className="flex items-center justify-between bg-gray-50 px-4 py-1.5 sm:hidden">
              <div className="flex items-center gap-2">
                <span className="w-5 shrink-0" />
                <span className="text-xs tabular-nums text-gray-400">{season}</span>
              </div>
              <span className="text-xs tabular-nums text-gray-400">{histPts.toFixed(1)} pts</span>
            </div>
            {/* Desktop history row */}
            <div className="hidden items-center gap-3 bg-gray-50 px-4 py-2.5 sm:flex">
              <div className={`grid ${config.gridCols} flex-1 items-center gap-2`}>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="w-5 shrink-0" />
                </div>
                <span className="text-left text-xs tabular-nums text-gray-400">{season}</span>
                {histStatValues.map((v, i) => (
                  <span key={i} className="text-right text-xs tabular-nums text-gray-400">
                    {typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(1)) : v}
                  </span>
                ))}
                <span className="text-right text-xs tabular-nums text-gray-400">
                  {histPts.toFixed(1)}
                </span>
              </div>
              <div className="h-4 w-4 shrink-0" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const NFL_DIVISIONS = [
  { label: 'AFC East',  teams: ['BUF', 'MIA', 'NE',  'NYJ'] },
  { label: 'AFC North', teams: ['BAL', 'CIN', 'CLE', 'PIT'] },
  { label: 'AFC South', teams: ['HOU', 'IND', 'JAX', 'TEN'] },
  { label: 'AFC West',  teams: ['DEN', 'KC',  'LV',  'LAC'] },
  { label: 'NFC East',  teams: ['DAL', 'NYG', 'PHI', 'WAS'] },
  { label: 'NFC North', teams: ['CHI', 'DET', 'GB',  'MIN'] },
  { label: 'NFC South', teams: ['ATL', 'CAR', 'NO',  'TB']  },
  { label: 'NFC West',  teams: ['ARI', 'LAR', 'LA',  'SF',  'SEA'] },
];

const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE'] as const;

export default function TeamsView({
  players,
  defaultPoints,
  defaultProjections,
  teams,
  teamHistory,
  teamsData,
  historySeason,
  fixedTeam,
}: {
  players: Player[];
  defaultPoints: Record<string, number>;
  defaultProjections: Record<string, PlayerProjection>;
  teams: string[];
  teamHistory: Record<string, TeamHistoryPlayer[]>;
  teamsData: Record<string, TeamInfo>;
  historySeason: number;
  fixedTeam?: string;
}) {
  const { scoringSettings } = useScoringType();
  const [collapsedPositions, setCollapsedPositions] = useState<Set<string>>(new Set());
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTeam = fixedTeam ?? searchParams.get('team') ?? teams[0] ?? '';
  const [activeTeam, setActiveTeam] = useState(initialTeam);

  function selectTeam(team: string) {
    setActiveTeam(team);
    setCollapsedPositions(new Set());
    router.replace(`/teams?team=${team}`, { scroll: false });
  }

  function togglePosition(pos: string) {
    setCollapsedPositions((prev) => {
      const next = new Set(prev);
      if (next.has(pos)) next.delete(pos);
      else next.add(pos);
      return next;
    });
  }
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

  const globalRanks = useMemo(() => {
    const sorted = [...players].sort((a, b) => {
      const ptA = projectedPoints[a.player_id] ?? -1;
      const ptB = projectedPoints[b.player_id] ?? -1;
      return ptB - ptA;
    });
    return Object.fromEntries(sorted.map((p, i) => [p.player_id, i + 1]));
  }, [players, projectedPoints]);

  const byPosition = useMemo(() => {
    const teamPlayers = players
      .filter((p) => p.team === activeTeam)
      .sort((a, b) => {
        const ptA = projectedPoints[a.player_id] ?? -1;
        const ptB = projectedPoints[b.player_id] ?? -1;
        return ptB - ptA;
      });

    const groups = new Map<string, Player[]>(POSITION_ORDER.map((pos) => [pos, []]));
    for (const player of teamPlayers) {
      const pos = POSITION_ORDER.find((p) => player.positions.includes(p));
      if (pos) groups.get(pos)!.push(player);
    }
    return groups;
  }, [players, activeTeam, projectedPoints]);

  const historyByPlayerId = useMemo(() => {
    const lookup: Record<string, TeamHistoryPlayer> = {};
    for (const p of teamHistory[activeTeam] ?? []) {
      lookup[p.player_id] = p;
    }
    return lookup;
  }, [teamHistory, activeTeam]);

  const teamsSet = useMemo(() => new Set(teams), [teams]);
  const claimedTeams = useMemo(
    () => new Set(NFL_DIVISIONS.flatMap((d) => d.teams)),
    [],
  );
  const otherTeams = useMemo(
    () => teams.filter((t) => t !== 'FA' && !claimedTeams.has(t)),
    [teams, claimedTeams],
  );

  function TeamButton({ team }: { team: string }) {
    const colors = TEAM_COLORS[team];
    const isActive = activeTeam === team;
    return (
      <button
        onClick={() => selectTeam(team)}
        style={isActive && colors ? { backgroundColor: colors.primary, color: colors.onPrimary ?? '#ffffff' } : undefined}
        className={`rounded border px-2 py-0.5 text-[11px] font-bold tracking-wider transition-colors ${
          isActive
            ? !colors ? 'border-transparent bg-gray-600 text-white' : 'border-transparent'
            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
        }`}
      >
        {team === 'FA' ? 'Free Agents' : team}
      </button>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!fixedTeam && (
        <>
          <div className="shrink-0 mb-5 space-y-3">
            {/* AFC */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              {NFL_DIVISIONS.slice(0, 4).map(({ label, teams: divTeams }) => {
                const available = divTeams.filter((t) => teamsSet.has(t));
                if (available.length === 0) return null;
                return (
                  <div key={label}>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-600">{label}</span>
                    <div className="flex flex-wrap gap-0.5">
                      {available.map((t) => <TeamButton key={t} team={t} />)}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* NFC */}
            <div className="border-t border-gray-200 pt-3">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                {NFL_DIVISIONS.slice(4).map(({ label, teams: divTeams }) => {
                  const available = divTeams.filter((t) => teamsSet.has(t));
                  if (available.length === 0) return null;
                  return (
                    <div key={label}>
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-600">{label}</span>
                      <div className="flex flex-wrap gap-0.5">
                        {available.map((t) => <TeamButton key={t} team={t} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
              {otherTeams.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-0.5">
                  {otherTeams.map((t) => <TeamButton key={t} team={t} />)}
                </div>
              )}
            </div>
          </div>

        </>
      )}

      <div className="shrink-0">
        <TeamSummaryCard
          players={teamHistory[activeTeam] ?? []}
          historySeason={historySeason}
          activeTeam={activeTeam}
          teamPlayers={players.filter((p) => p.team === activeTeam)}
          projections={projections}
          teamInfo={teamsData[activeTeam]}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4">
          {POSITION_ORDER.map((pos) => {
            const curPlayers = byPosition.get(pos) ?? [];
            const config = PROJ_CONFIG[pos];
            const isCollapsed = collapsedPositions.has(pos);
            return (
              <div key={`cur-${pos}`} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <button
                  onClick={() => togglePosition(pos)}
                  className="flex w-full items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 sm:hidden"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Rnk</span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">{pos}</span>
                    <span className="text-xs text-gray-400">({curPlayers.length})</span>
                  </div>
                  <svg
                    className={`h-4 w-4 text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => togglePosition(pos)}
                  className="hidden w-full items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2 sm:flex"
                >
                  <div className={`grid ${config.gridCols} flex-1 items-center gap-2`}>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Rnk</span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">{pos}</span>
                      <span className="text-xs text-gray-400">({curPlayers.length})</span>
                    </div>
                    {!isCollapsed && config.headers.map((h, i) => (
                      <span key={h} className={`${i === 0 ? 'text-left' : 'text-right'} text-xs font-medium uppercase tracking-wide text-gray-500`}>{h}</span>
                    ))}
                  </div>
                  <svg
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {!isCollapsed && (
                  <div className="divide-y divide-gray-100">
                    {curPlayers.map((player) => (
                      <ProjectionPlayerRow
                        key={player.player_id}
                        player={player}
                        projection={projections[player.player_id]}
                        projectedPoints={projectedPoints[player.player_id]}
                        rank={globalRanks[player.player_id]}
                        position={POSITION_ORDER.find((p) => player.positions.includes(p)) ?? 'WR'}
                        activeTeam={activeTeam}
                        historicalStats={historyByPlayerId[player.player_id]}
                        historySeason={historySeason}
                        scoringSettings={scoringSettings}
                      />
                    ))}
                    {curPlayers.length === 0 && (
                      <p className="px-4 py-4 text-center text-sm text-gray-400">No players</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
