import { Suspense } from 'react';
import { getRosters, getAllDefaultPoints, getAllDefaultProjections, getTeamHistory, getTeamsData, getTeamSummaries, currentNFLSeason } from '@/lib/data';
import type { TeamInfo } from '@/lib/data';
import NavHeader from '../_components/NavHeader';
import TeamsView from './_components/TeamsView';

export default function TeamsPage() {
  const players = getRosters();
  const defaultPoints = getAllDefaultPoints();
  const defaultProjections = getAllDefaultProjections();
  const teamHistory = getTeamHistory();
  const teamsData = getTeamsData();
  const teamSummaries = getTeamSummaries();
  const historySeason = currentNFLSeason();

  const teams = [...new Set(players.map((p) => p.team))]
    .filter((t) => t !== 'FA')
    .sort((a, b) => a.localeCompare(b));

  return (
    <main className="flex h-screen flex-col bg-gray-50">
      <NavHeader activePage="teams" />
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:overflow-visible sm:min-h-0 sm:flex sm:flex-col sm:px-6">
        <div className="mx-auto w-full max-w-7xl sm:flex sm:min-h-0 sm:flex-1 sm:flex-col">
          <Suspense>
            <TeamsView players={players} defaultPoints={defaultPoints} defaultProjections={defaultProjections} teams={teams} teamHistory={teamHistory} teamsData={teamsData} teamSummaries={teamSummaries} historySeason={historySeason} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
