import Link from 'next/link';
import { getFantasyPositions } from '@mocktail/core';
import type { Player, PlayerProjection, Position } from '@mocktail/core';

const POSITION_STYLES: Record<Position, string> = {
  QB: 'bg-blue-50 text-blue-600',
  RB: 'bg-emerald-50 text-emerald-600',
  WR: 'bg-violet-50 text-violet-600',
  TE: 'bg-orange-50 text-orange-600',
};

function ProjStats({ projection, position }: { projection: PlayerProjection; position: Position }) {
  const parts: string[] = [];

  if (position === 'QB') {
    if (projection.passing_yards > 0) parts.push(`${projection.passing_yards.toLocaleString()} yds`);
    if (projection.passing_tds > 0)   parts.push(`${projection.passing_tds} TD`);
    if (projection.interceptions > 0) parts.push(`${projection.interceptions} INT`);
  } else if (position === 'RB') {
    if (projection.rushing_yards > 0) parts.push(`${projection.rushing_yards.toLocaleString()} rush yds`);
    if (projection.rushing_tds > 0)   parts.push(`${projection.rushing_tds} TD`);
    if (projection.receptions > 0)    parts.push(`${projection.receptions} rec`);
  } else {
    if (projection.receptions > 0)      parts.push(`${projection.receptions} rec`);
    if (projection.receiving_yards > 0) parts.push(`${projection.receiving_yards.toLocaleString()} yds`);
    if (projection.receiving_tds > 0)   parts.push(`${projection.receiving_tds} TD`);
  }

  if (parts.length === 0) return null;

  return (
    <span className="text-xs tabular-nums text-gray-400">
      {parts.join(' · ')}
    </span>
  );
}

function StatChip({ value, unit = 'pts' }: { value?: number; unit?: string }) {
  if (value == null) return <span className="text-sm font-bold tabular-nums text-orange-500">—</span>;
  const isNegative = value < 0;
  const valueClass = isNegative ? 'text-gray-400' : 'text-orange-500';
  const prefix = unit === 'vorp' && !isNegative ? '+' : '';
  return (
    <div className="flex items-baseline gap-0.5">
      <span className={`text-sm font-bold tabular-nums ${valueClass}`}>{prefix}{value.toFixed(1)}</span>
      <span className="text-[11px] text-gray-400">{unit}</span>
    </div>
  );
}

export default function PlayerCard({
  player,
  rank,
  projectedPoints,
  pointsUnit,
  projection,
  compact,
}: {
  player: Player;
  rank?: number;
  projectedPoints?: number;
  pointsUnit?: string;
  projection?: PlayerProjection;
  compact?: boolean;
}) {
  const fantasyPositions = getFantasyPositions(player.positions);
  const primaryPosition = fantasyPositions[0];

  if (compact) {
    return (
      <Link
        href={`/players/${player.player_id}`}
        className="group grid grid-cols-[32px_minmax(0,1fr)_44px_80px_16px] items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
      >
        <span className="text-sm font-medium text-gray-400">{rank}</span>
        <div className="flex min-w-0 items-center gap-2">
          <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${POSITION_STYLES[primaryPosition]}`}>
            {primaryPosition}
          </span>
          <span className="truncate text-base font-bold text-gray-900 group-hover:text-gray-700">
            {player.player_name}
          </span>
        </div>
        <span className="text-sm text-gray-500">{player.age ?? '—'}</span>
        <div className="flex justify-end">
          <StatChip value={projectedPoints} unit={pointsUnit} />
        </div>
        <svg className="h-4 w-4 text-gray-300 group-hover:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    );
  }

  return (
    <Link
      href={`/players/${player.player_id}`}
      className="group grid grid-cols-[32px_minmax(0,1fr)_52px_80px_44px_minmax(0,2fr)_88px_16px] items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50"
    >
      <span className="text-sm font-medium text-gray-400">{rank}</span>
      <span className="truncate text-base font-bold text-gray-900 group-hover:text-gray-700">
        {player.player_name}
      </span>

      <span className="text-sm text-gray-600">{player.team}</span>

      <div className="flex flex-wrap gap-1">
        {fantasyPositions.map((pos) => (
          <span key={pos} className={`rounded px-1.5 py-0.5 text-xs font-medium ${POSITION_STYLES[pos]}`}>
            {pos}
          </span>
        ))}
      </div>

      <span className="text-sm text-gray-500">{player.age ?? '—'}</span>

      <span>
        {projection && <ProjStats projection={projection} position={primaryPosition} />}
      </span>

      <div className="flex justify-end">
        <StatChip value={projectedPoints} unit={pointsUnit} />
      </div>

      <svg className="h-4 w-4 text-gray-300 group-hover:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
