import type { Position, SeasonStats } from '@mocktail/core';
import HistoricalStatsTable from './HistoricalStatsTable';
import ProjectionForm from './ProjectionForm';

interface Props {
  playerId: string;
  fantasyPositions: Position[];
  seasons: SeasonStats[];
  season: number;
}

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--color-text-tertiary)',
  marginBottom: '8px',
  display: 'block',
};

export default function PositionTabs({ playerId, fantasyPositions, seasons, season }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <ProjectionForm playerId={playerId} positions={fantasyPositions} seasons={seasons} season={season} />

      {seasons.length > 0 && (
        <div>
          <span style={labelStyle}>Historical Stats</span>
          <HistoricalStatsTable seasons={seasons} />
        </div>
      )}
    </div>
  );
}
