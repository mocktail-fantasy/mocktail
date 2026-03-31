'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Position, PlayerProjection, SeasonStats } from '@mocktail/core';
import { calculateFantasyPoints, getDefaultProjection } from '@mocktail/core';
import { useScoringType } from '@/app/_components/ScoringContext';

// ─── helpers ────────────────────────────────────────────────────────────────

function toStrings(proj: PlayerProjection): Record<string, string> {
  return Object.fromEntries(Object.entries(proj).map(([k, v]) => [k, String(v)]));
}

function toProjection(values: Record<string, string>): PlayerProjection {
  const num = (key: string) => Math.max(0, parseFloat(values[key] ?? '0') || 0);
  return {
    passing_yards: num('passing_yards'),
    passing_tds: num('passing_tds'),
    interceptions: num('interceptions'),
    receptions: num('receptions'),
    receiving_yards: num('receiving_yards'),
    receiving_tds: num('receiving_tds'),
    rushing_yards: num('rushing_yards'),
    rushing_tds: num('rushing_tds'),
    fumbles_lost: num('fumbles_lost'),
  };
}

// ─── sub-components ─────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  fieldKey: string;
  value: string;
  isDefault: boolean;
  onChange: (key: string, val: string) => void;
}

function StatInput({ label, fieldKey, value, isDefault, onChange }: FieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{
        fontSize: '10px',
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontWeight: 500,
      }}>
        {label}
      </label>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        style={{
          width: '100%',
          borderRadius: '6px',
          padding: '7px 10px',
          fontSize: '13px',
          fontFamily: 'inherit',
          fontVariantNumeric: 'tabular-nums',
          outline: 'none',
          transition: 'border-color 0.15s, background 0.15s',
          border: `0.5px solid ${isDefault ? 'var(--color-border-medium)' : 'var(--color-input-modified-border)'}`,
          background: isDefault ? 'var(--color-bg-primary)' : 'var(--color-input-modified-bg)',
          color: isDefault ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
        }}
      />
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  cols?: number;
}

function Section({ title, children, cols = 3 }: SectionProps) {
  const colClass = cols === 2 ? 'grid-cols-2' : cols === 1 ? 'grid-cols-1' : 'grid-cols-3';
  return (
    <div>
      <p style={{
        fontSize: '10px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color: 'var(--color-text-tertiary)',
        marginBottom: '10px',
      }}>
        {title}
      </p>
      <div className={`grid gap-3 ${colClass}`}>{children}</div>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

interface Props {
  playerId: string;
  positions: Position[];
  seasons: SeasonStats[];
  season: number;
}

const SCORING_LABELS: Record<string, string> = {
  standard: 'Standard',
  half_ppr: '0.5 PPR',
  ppr: 'PPR',
};

export default function ProjectionForm({ playerId, positions, seasons, season }: Props) {
  const { scoringType, scoringSettings } = useScoringType();
  const hasQB = positions.includes('QB');
  const hasSkill = positions.some((p) => p === 'RB' || p === 'WR' || p === 'TE');

  const defaultProjection = useMemo(() => getDefaultProjection(seasons), [seasons]);
  const defaultStrings = useMemo(() => toStrings(defaultProjection), [defaultProjection]);

  const [values, setValues] = useState<Record<string, string>>(defaultStrings);
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    const raw = localStorage.getItem(`projection_${playerId}`);
    if (raw) {
      try {
        setValues(toStrings(JSON.parse(raw) as PlayerProjection));
      } catch {
        // Corrupted entry — keep defaults
      }
    }
  }, [playerId]);

  const handleChange = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const isDefault = (key: string) => values[key] === defaultStrings[key];

  const projection = useMemo(() => toProjection(values), [values]);
  const fantasyPoints = useMemo(
    () => calculateFantasyPoints(projection, positions, scoringSettings),
    [projection, positions, scoringSettings],
  );

  const handleSave = () => {
    localStorage.setItem(`projection_${playerId}`, JSON.stringify(projection));
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 2000);
  };

  const field = (label: string, key: string) => (
    <StatInput
      key={key}
      label={label}
      fieldKey={key}
      value={values[key] ?? '0'}
      isDefault={isDefault(key)}
      onChange={handleChange}
    />
  );

  return (
    <div className="card">
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '0.5px solid var(--color-border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--color-bg-secondary)',
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
            Your {season} projection
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
            Edit any stat to update your ranking
          </div>
        </div>
        <span style={{
          fontSize: '11px',
          fontWeight: 500,
          padding: '3px 8px',
          borderRadius: '4px',
          background: 'var(--color-baseline-bg)',
          color: 'var(--color-baseline-text)',
          border: '0.5px solid var(--color-baseline-border)',
          whiteSpace: 'nowrap',
        }}>
          Baseline: {season - 1} season
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '16px' }}>
        <div className="space-y-6">
          {hasQB && (
            <Section title="Passing" cols={3}>
              {field('Pass TDs', 'passing_tds')}
              {field('Pass Yards', 'passing_yards')}
              {field('INT', 'interceptions')}
            </Section>
          )}

          {hasSkill && (
            <Section title="Receiving" cols={3}>
              {field('Receptions', 'receptions')}
              {field('Rec Yards', 'receiving_yards')}
              {field('Rec TDs', 'receiving_tds')}
            </Section>
          )}

          <Section title="Rushing" cols={2}>
            {field('Rush TDs', 'rushing_tds')}
            {field('Rush Yards', 'rushing_yards')}
          </Section>

          <Section title="Misc" cols={3}>
            {field('Fumbles Lost', 'fumbles_lost')}
          </Section>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '0.5px solid var(--color-border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--color-bg-secondary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{
            fontSize: '22px',
            fontWeight: 500,
            color: 'var(--color-brand)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {fantasyPoints.toFixed(1)}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            pts · {SCORING_LABELS[scoringType] ?? 'Standard'}
          </span>
        </div>
        <button className="btn-brand" onClick={handleSave}>
          {saveState === 'saved' ? 'Saved ✓' : 'Save projection'}
        </button>
      </div>
    </div>
  );
}
