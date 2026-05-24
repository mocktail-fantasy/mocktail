import { getRosters, getAllDefaultPoints, getAllDefaultProjections, getNewsByPlayer, getRankings } from '@/lib/data';
import { listRankings } from '@/lib/rankings-actions';
import NavHeader from './_components/NavHeader';
import RosterGrid from './_components/RosterGrid';
import ScoringPanel from './_components/ScoringPanel';
import { RankingProvider } from './_components/RankingContext';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ ranking?: string }>;
}) {
  const sp = await searchParams;
  const [players, defaultPoints, defaultProjections, newsByPlayer, rankings, userRankings] = await Promise.all([
    getRosters(),
    getAllDefaultPoints(),
    getAllDefaultProjections(),
    getNewsByPlayer(),
    getRankings(),
    listRankings(),
  ]);
  const initialActiveId = sp.ranking && userRankings.some((r) => r.id === sp.ranking) ? sp.ranking : null;
  // Player has news if any items are within the 30-day window.
  const newsPlayerIds = new Set(
    Object.entries(newsByPlayer).filter(([, items]) => items.length > 0).map(([id]) => id)
  );

  const adpMap: Record<string, number> = {};
  const ecrMap: Record<string, Record<string, { rank: number; posRank: string }>> = {};
  for (const [playerId, ranking] of Object.entries(rankings)) {
    if (ranking.adp != null) adpMap[playerId] = ranking.adp;
    const formats: Record<string, { rank: number; posRank: string }> = {};
    for (const [fmt, data] of Object.entries(ranking.rankings)) {
      if (data) formats[fmt] = { rank: data.rank_ecr, posRank: data.pos_rank };
    }
    if (Object.keys(formats).length > 0) ecrMap[playerId] = formats;
  }

  return (
    <main style={{ background: 'var(--color-bg-tertiary)' }}>
      <NavHeader activePage="rankings" />
      <div className="px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-7xl flex flex-col gap-4">
          <RankingProvider rankings={userRankings} initialActiveId={initialActiveId}>
            <ScoringPanel />
            <RosterGrid players={players} defaultPoints={defaultPoints} defaultProjections={defaultProjections} newsPlayerIds={newsPlayerIds} adpMap={adpMap} ecrMap={ecrMap} />
          </RankingProvider>
        </div>
      </div>
    </main>
  );
}
