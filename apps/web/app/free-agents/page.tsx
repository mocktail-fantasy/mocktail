import { Suspense } from 'react';
import { getRosters, getAllDefaultPoints, getAllDefaultProjections, getTeamHistory, getTeamsData, getTeamSummaries, currentNFLSeason } from '@/lib/data';
import NavHeader from '../_components/NavHeader';
import TeamsView from '../teams/_components/TeamsView';

export default function FreeAgentsPage() {
  const players = getRosters();
  const defaultPoints = getAllDefaultPoints();
  const defaultProjections = getAllDefaultProjections();
  const teamHistory = getTeamHistory();
  const teamsData = getTeamsData();
  const teamSummaries = getTeamSummaries();
  const historySeason = currentNFLSeason();

  return (
    <main className="flex h-screen flex-col bg-gray-50">
      <NavHeader activePage="free-agents" />
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:overflow-visible sm:min-h-0 sm:flex sm:flex-col sm:px-6">
        <div className="mx-auto w-full max-w-7xl sm:flex sm:min-h-0 sm:flex-1 sm:flex-col">
          <Suspense>
            <TeamsView
              players={players}
              defaultPoints={defaultPoints}
              defaultProjections={defaultProjections}
              teams={[]}
              teamHistory={teamHistory}
              teamsData={teamsData}
              teamSummaries={teamSummaries}
              historySeason={historySeason}
              fixedTeam="FA"
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
