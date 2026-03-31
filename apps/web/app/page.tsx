import { getRosters, getAllDefaultPoints, getAllDefaultProjections, getPlayerSummaries } from '@/lib/data';
import NavHeader from './_components/NavHeader';
import RosterGrid from './_components/RosterGrid';
import ScoringPanel from './_components/ScoringPanel';

export default function HomePage() {
  const players = getRosters();
  const defaultPoints = getAllDefaultPoints();
  const defaultProjections = getAllDefaultProjections();
  const summaries = getPlayerSummaries();
  const newsPlayerIds = new Set(Object.keys(summaries));

  return (
    <main className="flex h-screen flex-col" style={{ background: 'var(--color-bg-tertiary)' }}>
      <NavHeader activePage="rankings" />
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:overflow-visible sm:min-h-0 sm:flex sm:flex-col sm:px-6">
        <div className="mx-auto w-full max-w-7xl flex flex-col gap-4 sm:min-h-0 sm:flex-1">
          <ScoringPanel />
          <RosterGrid players={players} defaultPoints={defaultPoints} defaultProjections={defaultProjections} newsPlayerIds={newsPlayerIds} />
        </div>
      </div>
    </main>
  );
}
