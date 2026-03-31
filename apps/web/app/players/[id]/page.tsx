import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPlayer, getPlayerHistory, getPlayerSummaries, currentNFLSeason } from '@/lib/data';
import { getFantasyPositions, getDefaultProjection } from '@mocktail/core';
import type { Position } from '@mocktail/core';
import PositionTabs from './_components/PositionTabs';
import PlayerAvatar from './_components/PlayerAvatar';
import LastSeasonPts from './_components/LastSeasonPts';
import NewsCard from './_components/NewsCard';
import LogoBlock from '@/app/_components/LogoBlock';
import PositionBadge from '@/app/_components/PositionBadge';

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ flex: 1, padding: '12px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>
        {label}
      </div>
    </div>
  );
}

function StatCellDivider() {
  return <div style={{ width: '0.5px', background: 'var(--color-border-light)', alignSelf: 'stretch', margin: '8px 0' }} />;
}

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const player = getPlayer(id);
  if (!player) notFound();

  const history = getPlayerHistory(id);
  const seasons = history?.seasons ?? [];
  const summaries = getPlayerSummaries();
  const playerSummary = summaries[player.player_id] ?? null;
  const fantasyPositions = getFantasyPositions(player.positions);
  const primaryPosition = fantasyPositions[0];
  const defaultProj = getDefaultProjection(seasons);
  const season = currentNFLSeason();

  const back =
    sp.from === 'teams'
      ? { href: sp.team ? `/teams?team=${sp.team}` : '/teams', label: 'Back to Teams' }
      : { href: '/', label: 'Back to Roster' };

  // Build stats bar cells based on position
  type Cell = { value: string; label: string };
  const statCells: Cell[] = [];
  if (primaryPosition === 'QB') {
    if (defaultProj.passing_yards > 0) statCells.push({ value: defaultProj.passing_yards.toLocaleString(), label: 'Pass Yds' });
    if (defaultProj.passing_tds > 0)   statCells.push({ value: String(defaultProj.passing_tds), label: 'Pass TDs' });
    if (defaultProj.interceptions > 0) statCells.push({ value: String(defaultProj.interceptions), label: 'INT' });
    if (defaultProj.rushing_yards > 0) statCells.push({ value: defaultProj.rushing_yards.toLocaleString(), label: 'Rush Yds' });
    if (defaultProj.rushing_tds > 0)   statCells.push({ value: String(defaultProj.rushing_tds), label: 'Rush TDs' });
  } else if (primaryPosition === 'RB') {
    if (defaultProj.rushing_yards > 0) statCells.push({ value: defaultProj.rushing_yards.toLocaleString(), label: 'Rush Yds' });
    if (defaultProj.rushing_tds > 0)   statCells.push({ value: String(defaultProj.rushing_tds), label: 'Rush TDs' });
    if (defaultProj.receptions > 0)    statCells.push({ value: String(defaultProj.receptions), label: 'Rec' });
    if (defaultProj.receiving_yards > 0) statCells.push({ value: defaultProj.receiving_yards.toLocaleString(), label: 'Rec Yds' });
    if (defaultProj.receiving_tds > 0) statCells.push({ value: String(defaultProj.receiving_tds), label: 'Rec TDs' });
  } else {
    if (defaultProj.receptions > 0)      statCells.push({ value: String(defaultProj.receptions), label: 'Rec' });
    if (defaultProj.receiving_yards > 0) statCells.push({ value: defaultProj.receiving_yards.toLocaleString(), label: 'Rec Yds' });
    if (defaultProj.receiving_tds > 0)   statCells.push({ value: String(defaultProj.receiving_tds), label: 'Rec TDs' });
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-bg-secondary)' }}>
      {/* Minimal branded header — logo + tagline only */}
      <header style={{
        background: 'var(--color-bg-primary)',
        borderBottom: '0.5px solid var(--color-border-light)',
        padding: '0 20px',
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <LogoBlock />
      </header>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Back link */}
        <div>
          <Link
            href={back.href}
            style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            ← {back.label}
          </Link>
        </div>

        {/* Hero card */}
        <div className="card">
          {/* Header zone */}
          <div style={{
            padding: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            borderBottom: statCells.length > 0 ? '0.5px solid var(--color-border-light)' : 'none',
          }}>
            <PlayerAvatar
              name={player.player_name}
              headshot={player.headshot}
              primaryPosition={primaryPosition}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '20px', fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
                {player.player_name}
              </div>
              <div style={{
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
              }}>
                <span>{player.team}</span>
                <span style={{ color: 'var(--color-border-medium)' }}>·</span>
                {fantasyPositions.map((pos: Position) => (
                  <PositionBadge key={pos} position={pos} />
                ))}
                <span style={{ color: 'var(--color-border-medium)' }}>·</span>
                <span>Age {player.age}</span>
              </div>
            </div>
            {seasons.length > 0 && (
              <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                <LastSeasonPts seasons={seasons} />
              </div>
            )}
          </div>

          {/* Stats bar zone */}
          {statCells.length > 0 && (
            <div style={{ display: 'flex', overflowX: 'auto' }}>
              {statCells.map((cell, i) => (
                <div key={cell.label} style={{ display: 'flex', flex: 1 }}>
                  {i > 0 && <StatCellDivider />}
                  <StatCell value={cell.value} label={cell.label} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* News card */}
        {playerSummary && <NewsCard summary={playerSummary} />}

        {/* Projection form + historical stats */}
        <PositionTabs
          playerId={player.player_id}
          fantasyPositions={fantasyPositions}
          seasons={seasons}
          season={season}
        />
      </div>
    </main>
  );
}
