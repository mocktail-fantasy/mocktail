import { getRosters, getAllDefaultPoints, getAllDefaultProjections, getPlayerSummaries, getRankings } from '@/lib/data';
import NavHeader from './_components/NavHeader';
import RosterGrid from './_components/RosterGrid';
import ScoringPanel from './_components/ScoringPanel';

export default async function HomePage() {
  const [players, defaultPoints, defaultProjections, summaries, rankings] = await Promise.all([
    getRosters(),
    getAllDefaultPoints(),
    getAllDefaultProjections(),
    getPlayerSummaries(),
    getRankings(),
  ]);
  const newsPlayerIds = new Set(Object.keys(summaries));

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
    <main className="flex h-screen flex-col" style={{ background: 'var(--color-bg-tertiary)' }}>
      <NavHeader activePage="rankings" />
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:overflow-visible sm:min-h-0 sm:flex sm:flex-col sm:px-6">
        <div className="mx-auto w-full max-w-7xl flex flex-col gap-4 sm:min-h-0 sm:flex-1">
          <ScoringPanel />
          <RosterGrid players={players} defaultPoints={defaultPoints} defaultProjections={defaultProjections} newsPlayerIds={newsPlayerIds} adpMap={adpMap} ecrMap={ecrMap} />
        </div>
      </div>
    </main>
  );
}
