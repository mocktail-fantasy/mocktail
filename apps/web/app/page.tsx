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
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:overflow-visible sm:min-h-0 sm:flex sm:flex-col sm:px-6">
        <div className="mx-auto w-full max-w-7xl sm:flex sm:min-h-0 sm:flex-1 sm:flex-col">
          <RosterGrid players={players} defaultPoints={defaultPoints} defaultProjections={defaultProjections} />
        </div>
      </div>
    </main>
  );
}
