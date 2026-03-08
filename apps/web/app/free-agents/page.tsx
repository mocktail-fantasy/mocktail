import { Suspense } from 'react';
import { getRosters, getAllDefaultPoints, getAllDefaultProjections, getTeamHistory, getTeamsData, currentNFLSeason } from '@/lib/data';
import NavHeader from '../_components/NavHeader';
import TeamsView from '../teams/_components/TeamsView';

export default function FreeAgentsPage() {
  const players = getRosters();
  const defaultPoints = getAllDefaultPoints();
  const defaultProjections = getAllDefaultProjections();
  const teamHistory = getTeamHistory();
  const teamsData = getTeamsData();
  const historySeason = currentNFLSeason();

  return (
    <main className="flex h-screen flex-col bg-gray-50">
      <NavHeader activePage="free-agents" />
      <div className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full min-h-0 max-w-7xl flex-1 flex-col">
          <Suspense>
            <TeamsView
              players={players}
              defaultPoints={defaultPoints}
              defaultProjections={defaultProjections}
              teams={[]}
              teamHistory={teamHistory}
              teamsData={teamsData}
              historySeason={historySeason}
              fixedTeam="FA"
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
