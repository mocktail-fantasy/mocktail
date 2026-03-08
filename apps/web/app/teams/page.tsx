import { Suspense } from 'react';
import { getRosters, getAllDefaultPoints, getAllDefaultProjections, getTeamHistory, getTeamsData, currentNFLSeason } from '@/lib/data';
import type { TeamInfo } from '@/lib/data';
import NavHeader from '../_components/NavHeader';
import TeamsView from './_components/TeamsView';

export default function TeamsPage() {
  const players = getRosters();
  const defaultPoints = getAllDefaultPoints();
  const defaultProjections = getAllDefaultProjections();
  const teamHistory = getTeamHistory();
  const teamsData = getTeamsData();
  const historySeason = currentNFLSeason();

  const teams = [...new Set(players.map((p) => p.team))]
    .filter((t) => t !== 'FA')
    .sort((a, b) => a.localeCompare(b));

  return (
    <main className="flex h-screen flex-col bg-gray-50">
      <NavHeader activePage="teams" />
      <div className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full min-h-0 max-w-7xl flex-1 flex-col">
          <Suspense>
            <TeamsView players={players} defaultPoints={defaultPoints} defaultProjections={defaultProjections} teams={teams} teamHistory={teamHistory} teamsData={teamsData} historySeason={historySeason} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
