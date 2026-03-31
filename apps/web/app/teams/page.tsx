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
    <main style={{ background: 'var(--color-bg-tertiary)' }}>
      <NavHeader activePage="teams" />
      <div className="px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-7xl">
          <Suspense>
            <TeamsView players={players} defaultPoints={defaultPoints} defaultProjections={defaultProjections} teams={teams} teamHistory={teamHistory} teamsData={teamsData} teamSummaries={teamSummaries} historySeason={historySeason} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
