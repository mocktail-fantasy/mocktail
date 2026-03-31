import type { Position } from '@mocktail/core';

export default function PositionBadge({ position }: { position: Position }) {
  return (
    <span className={`badge-pos badge-pos-${position}`}>
      {position}
    </span>
  );
}
