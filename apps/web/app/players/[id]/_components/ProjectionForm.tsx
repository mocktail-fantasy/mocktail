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
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</label>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className={`w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm transition-colors focus:border-orange-400 focus:outline-none ${
          isDefault ? 'text-gray-400' : 'text-gray-900'
        }`}
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
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</p>
      <div className={`grid gap-3 ${colClass}`}>{children}</div>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

interface Props {
  playerId: string;
  positions: Position[];
  seasons: SeasonStats[];
}

const SCORING_LABELS: Record<string, string> = {
  standard: 'Standard',
  half_ppr: '0.5 PPR',
  ppr: 'PPR',
};

export default function ProjectionForm({ playerId, positions, seasons }: Props) {
  const { scoringType, scoringSettings } = useScoringType();
  const hasQB = positions.includes('QB');
  const hasSkill = positions.some((p) => p === 'RB' || p === 'WR' || p === 'TE');

  const defaultProjection = useMemo(() => getDefaultProjection(seasons), [seasons]);
  const defaultStrings = useMemo(() => toStrings(defaultProjection), [defaultProjection]);

  const [values, setValues] = useState<Record<string, string>>(defaultStrings);
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');

  // Load from localStorage after mount to avoid SSR mismatch
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
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
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

      <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-5">
        <div>
          <p className="text-xs text-gray-500">{SCORING_LABELS[scoringType] ?? 'Standard'} Scoring</p>
          <p className="text-2xl font-bold text-gray-900">
            {fantasyPoints.toFixed(1)}{' '}
            <span className="text-sm font-normal text-orange-500">pts</span>
          </p>
        </div>
        <button
          onClick={handleSave}
          className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
            saveState === 'saved'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-600'
              : 'bg-orange-500 text-white hover:bg-orange-600'
          }`}
        >
          {saveState === 'saved' ? 'Saved ✓' : 'Save Projection'}
        </button>
      </div>
    </div>
  );
}
