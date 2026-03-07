import type { Position, SeasonStats } from '@mocktail/core';
import HistoricalStatsTable from './HistoricalStatsTable';
import ProjectionForm from './ProjectionForm';

interface Props {
  playerId: string;
  fantasyPositions: Position[];
  seasons: SeasonStats[];
}

export default function PositionTabs({ playerId, fantasyPositions, seasons }: Props) {
  return (
    <div>
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          2026 Projection
        </h2>
        <ProjectionForm playerId={playerId} positions={fantasyPositions} seasons={seasons} />
      </section>

      {seasons.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Historical Stats
          </h2>
          <HistoricalStatsTable seasons={seasons} />
        </section>
      )}
    </div>
  );
}
