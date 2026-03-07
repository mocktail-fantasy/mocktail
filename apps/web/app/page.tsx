import { getRosters, getAllDefaultPoints, getAllDefaultProjections } from '@/lib/data';
import NavHeader from './_components/NavHeader';
import RosterGrid from './_components/RosterGrid';

export default function HomePage() {
  const players = getRosters();
  const defaultPoints = getAllDefaultPoints();
  const defaultProjections = getAllDefaultProjections();

  return (
    <main className="flex h-screen flex-col bg-gray-50">
      <NavHeader activePage="rankings" />
      <div className="flex min-h-0 flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full min-h-0 max-w-7xl flex-1 flex-col">
          <RosterGrid players={players} defaultPoints={defaultPoints} defaultProjections={defaultProjections} />
        </div>
      </div>
    </main>
  );
}
