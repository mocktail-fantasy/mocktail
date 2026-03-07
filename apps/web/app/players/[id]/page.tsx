import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPlayer, getPlayerHistory } from '@/lib/data';
import { getFantasyPositions, getDefaultProjection } from '@mocktail/core';
import type { Position } from '@mocktail/core';
import PositionTabs from './_components/PositionTabs';
import PlayerAvatar from './_components/PlayerAvatar';
import LastSeasonPts from './_components/LastSeasonPts';

const POSITION_STYLES: Record<Position, string> = {
  QB: 'bg-blue-50 text-blue-600',
  RB: 'bg-emerald-50 text-emerald-600',
  WR: 'bg-violet-50 text-violet-600',
  TE: 'bg-orange-50 text-orange-600',
};

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
  const fantasyPositions = getFantasyPositions(player.positions);
  const primaryPosition = fantasyPositions[0];
  const defaultProj = getDefaultProjection(seasons);

  const back =
    sp.from === 'teams'
      ? { href: sp.team ? `/teams?team=${sp.team}` : '/teams', label: 'Back to Teams' }
      : { href: '/', label: 'Back to Roster' };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-8 py-6 shadow-sm">
        <Link href={back.href} className="text-base text-gray-500 transition-colors hover:text-gray-900">
          ← {back.label}
        </Link>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Player header */}
        <div className="mb-8 flex items-center gap-6">
          <PlayerAvatar
            name={player.player_name}
            headshot={player.headshot}
            primaryPosition={fantasyPositions[0]}
          />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{player.player_name}</h1>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-base text-gray-500">{player.team}</span>
              {fantasyPositions.map((pos) => (
                <span
                  key={pos}
                  className={`rounded px-2.5 py-0.5 text-sm font-medium ${POSITION_STYLES[pos]}`}
                >
                  {pos}
                </span>
              ))}
              <span className="text-base text-gray-400">Age {player.age}</span>
            </div>
            {seasons.length > 0 && (
              <div className="mt-3 flex items-stretch divide-x divide-gray-200">
                <LastSeasonPts seasons={seasons} />
                {primaryPosition === 'QB' && defaultProj.passing_yards > 0 && (
                  <div className="flex flex-col px-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Passing</span>
                    <span className="text-sm font-bold tabular-nums text-gray-900">
                      {defaultProj.passing_yards.toLocaleString()} yds · {defaultProj.passing_tds} TD
                    </span>
                  </div>
                )}
                {(primaryPosition === 'QB' || primaryPosition === 'RB') && defaultProj.rushing_yards > 0 && (
                  <div className="flex flex-col px-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Rushing</span>
                    <span className="text-sm font-bold tabular-nums text-gray-900">
                      {defaultProj.rushing_yards.toLocaleString()} yds · {defaultProj.rushing_tds} TD
                    </span>
                  </div>
                )}
                {(primaryPosition === 'WR' || primaryPosition === 'TE' || primaryPosition === 'RB') && defaultProj.receiving_yards > 0 && (
                  <div className="flex flex-col px-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Receiving</span>
                    <span className="text-sm font-bold tabular-nums text-gray-900">
                      {defaultProj.receptions} rec · {defaultProj.receiving_yards.toLocaleString()} yds · {defaultProj.receiving_tds} TD
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <PositionTabs
          playerId={player.player_id}
          fantasyPositions={fantasyPositions}
          seasons={seasons}
        />
      </div>
    </main>
  );
}
