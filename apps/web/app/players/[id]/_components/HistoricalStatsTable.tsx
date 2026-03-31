'use client';

import type { SeasonStats, ScoringType } from '@mocktail/core';
import { useScoringType } from '@/app/_components/ScoringContext';

function getSeasonPts(s: SeasonStats, scoringType: ScoringType): number {
  if (scoringType === 'ppr') return s.fantasy_points_ppr;
  if (scoringType === 'half_ppr') return (s.fantasy_points + s.fantasy_points_ppr) / 2;
  return s.fantasy_points;
}

interface Props {
  seasons: SeasonStats[];
}

export default function HistoricalStatsTable({ seasons }: Props) {
  const { scoringType } = useScoringType();
  const sorted = [...seasons].sort((a, b) => b.season - a.season);

  const hasPassing = seasons.some((s) => s.passing && (s.passing.yards > 0 || s.passing.tds > 0));
  const hasReceiving = seasons.some(
    (s) => s.receiving && (s.receiving.yards > 0 || s.receiving.receptions > 0),
  );
  const hasRushing = seasons.some((s) => s.rushing && (s.rushing.yards > 0 || s.rushing.tds > 0));

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'right',
    fontSize: '10px',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--color-text-tertiary)',
    whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'right',
    fontSize: '13px',
    color: 'var(--color-text-primary)',
    fontVariantNumeric: 'tabular-nums',
  };
  const tdSecStyle: React.CSSProperties = { ...tdStyle, color: 'var(--color-text-secondary)' };

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--color-border-light)', background: 'var(--color-bg-secondary)' }}>
              <th style={{ ...thStyle, textAlign: 'left', paddingLeft: '16px' }}>Season</th>
              <th style={thStyle}>G</th>
              {hasPassing && (
                <>
                  <th style={thStyle}>Pass Yds</th>
                  <th style={thStyle}>Pass TDs</th>
                  <th style={thStyle}>INT</th>
                </>
              )}
              {hasReceiving && (
                <>
                  <th style={thStyle}>Rec</th>
                  <th style={thStyle}>Rec Yds</th>
                  <th style={thStyle}>Rec TDs</th>
                </>
              )}
              {hasRushing && (
                <>
                  <th style={thStyle}>Rush Yds</th>
                  <th style={thStyle}>Rush TDs</th>
                </>
              )}
              <th style={thStyle}>Fum Lost</th>
              <th style={{ ...thStyle, paddingRight: '16px' }}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => (
              <tr
                key={s.season}
                className="hover:bg-[var(--color-bg-secondary)]"
                style={{
                  borderBottom: i < sorted.length - 1 ? '0.5px solid var(--color-border-light)' : 'none',
                  transition: 'background 0.1s',
                }}
              >
                <td style={{ ...tdStyle, textAlign: 'left', paddingLeft: '16px', fontWeight: 500 }}>{s.season}</td>
                <td style={tdSecStyle}>{s.games_played}</td>
                {hasPassing && (
                  <>
                    <td style={tdStyle}>{(s.passing?.yards ?? 0).toLocaleString()}</td>
                    <td style={tdStyle}>{s.passing?.tds ?? 0}</td>
                    <td style={tdStyle}>{s.passing?.interceptions ?? 0}</td>
                  </>
                )}
                {hasReceiving && (
                  <>
                    <td style={tdStyle}>{s.receiving?.receptions ?? 0}</td>
                    <td style={tdStyle}>{(s.receiving?.yards ?? 0).toLocaleString()}</td>
                    <td style={tdStyle}>{s.receiving?.tds ?? 0}</td>
                  </>
                )}
                {hasRushing && (
                  <>
                    <td style={tdStyle}>{(s.rushing?.yards ?? 0).toLocaleString()}</td>
                    <td style={tdStyle}>{s.rushing?.tds ?? 0}</td>
                  </>
                )}
                <td style={tdSecStyle}>{s.fumbles_lost}</td>
                <td style={{ ...tdStyle, paddingRight: '16px', fontWeight: 500, color: 'var(--color-brand)' }}>
                  {getSeasonPts(s, scoringType).toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
