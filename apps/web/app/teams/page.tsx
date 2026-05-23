import { Suspense } from 'react';
import { getRosters, getAllDefaultPoints, getAllDefaultProjections, getTeamHistory, getTeamsData, getNewsByTeam, currentNFLSeason } from '@/lib/data';
import NavHeader from '../_components/NavHeader';
import TeamsView from './_components/TeamsView';

export default async function TeamsPage() {
  const [players, defaultPoints, defaultProjections, teamHistory, teamsData, teamNews] = await Promise.all([
    getRosters(),
    getAllDefaultPoints(),
    getAllDefaultProjections(),
    getTeamHistory(),
    getTeamsData(),
    getNewsByTeam(),
  ]);
  const historySeason = currentNFLSeason();

  const allTeamSet = new Set(players.map((p) => p.team));
  const teams = [...allTeamSet]
    .filter((t) => t !== 'FA')
    .sort((a, b) => a.localeCompare(b));
  if (allTeamSet.has('FA')) teams.push('FA');

  return (
    <main style={{ background: 'var(--color-bg-tertiary)' }}>
      <NavHeader activePage="teams" />
      <div className="px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-7xl">
          <Suspense>
            <TeamsView players={players} defaultPoints={defaultPoints} defaultProjections={defaultProjections} teams={teams} teamHistory={teamHistory} teamsData={teamsData} teamNews={teamNews} historySeason={historySeason} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
