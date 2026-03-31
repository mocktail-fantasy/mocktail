import Link from 'next/link';
import { getFantasyPositions } from '@mocktail/core';
import type { Player, PlayerProjection, Position } from '@mocktail/core';
import PositionBadge from './PositionBadge';

function ProjStats({ projection, position }: { projection: PlayerProjection; position: Position }) {
  const parts: string[] = [];

  if (position === 'QB') {
    if (projection.passing_yards > 0) parts.push(`${projection.passing_yards.toLocaleString()} pass yds`);
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
    <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
      {parts.join(' · ')}
    </span>
  );
}

function StatChip({ value, unit = 'pts' }: { value?: number; unit?: string }) {
  const isPositive = value != null && value > 0;
  const prefix = unit === 'vorp' && isPositive ? '+' : '';

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', justifyContent: 'flex-end' }}>
      <span style={{
        fontSize: '15px',
        fontWeight: 500,
        fontVariantNumeric: 'tabular-nums',
        color: isPositive ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
      }}>
        {value != null ? `${prefix}${value.toFixed(1)}` : '—'}
      </span>
      <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>{unit}</span>
    </div>
  );
}

export default function PlayerCard({
  player,
  rank,
  projectedPoints,
  pointsUnit,
  projection,
  hasNews,
}: {
  player: Player;
  rank?: number;
  projectedPoints?: number;
  pointsUnit?: string;
  projection?: PlayerProjection;
  hasNews?: boolean;
}) {
  const fantasyPositions = getFantasyPositions(player.positions);
  const primaryPosition = fantasyPositions[0];

  return (
    <Link
      href={`/players/${player.player_id}`}
      className="grid grid-cols-[40px_minmax(0,1fr)_88px_16px] sm:grid-cols-[40px_minmax(0,1fr)_minmax(0,2fr)_88px_16px] items-center gap-3 sm:gap-4 px-4 py-3 transition-colors hover:bg-[var(--color-bg-secondary)]"
      style={{ textDecoration: 'none' }}
    >
      {/* Rank */}
      <span style={{
        fontSize: rank != null && rank <= 3 ? '22px' : '16px',
        fontWeight: rank != null && rank <= 3 ? 500 : 400,
        color: rank != null && rank <= 3 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
        fontVariantNumeric: 'tabular-nums',
        textAlign: 'right',
      }}>
        {rank ?? '—'}
      </span>

      {/* Name + meta */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {player.player_name}
          </span>
          {hasNews && (
            <span style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--color-brand)',
              flexShrink: 0,
            }} />
          )}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          marginTop: '2px',
          fontSize: '11px',
          color: 'var(--color-text-tertiary)',
        }}>
          <span>{player.team}</span>
          <span style={{ color: 'var(--color-border-medium)' }}>·</span>
          <PositionBadge position={primaryPosition} />
          <span style={{ color: 'var(--color-border-medium)' }}>·</span>
          <span>Age {player.age ?? '—'}</span>
        </div>
      </div>

      {/* Projected stats — hidden on mobile */}
      <span className="hidden sm:block">
        {projection && <ProjStats projection={projection} position={primaryPosition} />}
      </span>

      {/* Projected points */}
      <StatChip value={projectedPoints} unit={pointsUnit} />

      {/* Chevron */}
      <svg className="h-4 w-4" style={{ color: 'var(--color-text-tertiary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
