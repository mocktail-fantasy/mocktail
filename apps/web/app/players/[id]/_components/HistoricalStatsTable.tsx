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

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Season
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
              G
            </th>
            {hasPassing && (
              <>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Pass Yds
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Pass TDs
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  INT
                </th>
              </>
            )}
            {hasReceiving && (
              <>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Rec
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Rec Yds
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Rec TDs
                </th>
              </>
            )}
            {hasRushing && (
              <>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Rush Yds
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Rush TDs
                </th>
              </>
            )}
            <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
              Fum Lost
            </th>
            <th className="py-2.5 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
              Pts
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => (
            <tr
              key={s.season}
              className={`border-b border-gray-100 last:border-0 ${i % 2 !== 0 ? 'bg-gray-50/60' : ''}`}
            >
              <td className="py-2.5 pl-4 pr-3 font-medium text-gray-700">{s.season}</td>
              <td className="px-3 py-2.5 text-right text-gray-500">{s.games_played}</td>
              {hasPassing && (
                <>
                  <td className="px-3 py-2.5 text-right text-gray-700">
                    {(s.passing?.yards ?? 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{s.passing?.tds ?? 0}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">
                    {s.passing?.interceptions ?? 0}
                  </td>
                </>
              )}
              {hasReceiving && (
                <>
                  <td className="px-3 py-2.5 text-right text-gray-700">
                    {s.receiving?.receptions ?? 0}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-700">
                    {(s.receiving?.yards ?? 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-700">
                    {s.receiving?.tds ?? 0}
                  </td>
                </>
              )}
              {hasRushing && (
                <>
                  <td className="px-3 py-2.5 text-right text-gray-700">
                    {(s.rushing?.yards ?? 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{s.rushing?.tds ?? 0}</td>
                </>
              )}
              <td className="px-3 py-2.5 text-right text-gray-500">{s.fumbles_lost}</td>
              <td className="py-2.5 pl-3 pr-4 text-right font-semibold text-orange-500">
                {getSeasonPts(s, scoringType).toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
