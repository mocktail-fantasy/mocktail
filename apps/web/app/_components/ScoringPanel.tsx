'use client';

import type { ScoringType } from '@mocktail/core';
import { useScoringType } from './ScoringContext';
import { useRanking } from './RankingContext';

const SCORING_OPTIONS: { value: ScoringType; label: string }[] = [
  { value: 'half_ppr', label: '0.5 PPR' },
  { value: 'ppr', label: 'PPR' },
  { value: 'standard', label: 'STD' },
];

const MODIFIERS = [
  { key: 'tep' as const, label: 'TEP +0.5' },
  { key: 'twoQB' as const, label: '2QB' },
  { key: 'sixPtPass' as const, label: '6pt Pass TD' },
];

export default function ScoringPanel() {
  const { activeConfig } = useRanking();
  const { scoringType, setScoringType, tep, setTep, twoQB, setTwoQB, sixPtPass, setSixPtPass } = useScoringType();

  // Custom rankings bake the scoring config into the ranking itself — surfacing
  // these modifiers alongside would create a conflict-resolution problem.
  if (activeConfig) return null;

  const modifierValues = { tep, twoQB, sixPtPass };
  const modifierSetters = {
    tep: setTep,
    twoQB: setTwoQB,
    sixPtPass: setSixPtPass,
  };

  return (
    <div style={{
      background: 'var(--color-bg-secondary)',
      border: '0.5px solid var(--color-border-light)',
      borderRadius: '10px',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap',
    }}>
      {/* Scoring group */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          fontSize: '10px',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--color-text-tertiary)',
          whiteSpace: 'nowrap',
        }}>
          Scoring
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {SCORING_OPTIONS.map(({ value, label }) => {
            const isActive = scoringType === value;
            return (
              <button
                key={value}
                onClick={() => setScoringType(value)}
                style={{
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: 500,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  border: isActive ? '0.5px solid var(--color-brand)' : '0.5px solid var(--color-border-medium)',
                  background: isActive ? 'var(--color-brand)' : 'transparent',
                  color: isActive ? '#12120F' : 'var(--color-text-secondary)',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div style={{
        width: '0.5px',
        height: '20px',
        background: 'var(--color-border-light)',
        flexShrink: 0,
      }} />

      {/* Modifiers group */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '10px',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--color-text-tertiary)',
          whiteSpace: 'nowrap',
        }}>
          Modifiers
        </span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {MODIFIERS.map(({ key, label }) => {
            const isActive = modifierValues[key];
            return (
              <button
                key={key}
                onClick={() => modifierSetters[key](!isActive)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: isActive ? '0.5px solid var(--color-brand)' : '0.5px solid var(--color-border-medium)',
                  cursor: 'pointer',
                  background: 'transparent',
                  fontSize: '12px',
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isActive ? 'var(--color-brand)' : 'var(--color-border-medium)',
                  flexShrink: 0,
                }} />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
