'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  QBBehavior,
  RankingConfig,
  RankingFormatType,
  RankingRoster,
  ScoringType,
  SkillBehavior,
} from '@mocktail/core';
import { createRanking, updateRanking, type RankingDraft } from '@/lib/rankings-actions';

interface Props {
  initial?: RankingConfig;
}

function defaultRoster(): RankingRoster {
  return {
    qbStarters: 1,
    rbStarters: 2,
    wrStarters: 2,
    teStarters: 1,
    flexSlots: 1,
    superflexSlots: 0,
    benchSize: 6,
  };
}

export default function NewRankingForm({ initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [teams, setTeams] = useState(initial?.teams ?? 12);
  const [format, setFormat] = useState<RankingFormatType>(initial?.format ?? 'redraft_managed');
  const [scoringType, setScoringType] = useState<ScoringType>(initial?.scoring.scoringType ?? 'half_ppr');
  const [tep, setTep] = useState(initial?.scoring.tep ?? false);
  const [sixPt, setSixPt] = useState(initial?.scoring.sixPointPassTDs ?? false);
  const [superflex, setSuperflex] = useState((initial?.roster.superflexSlots ?? 0) > 0);
  const [qbBehavior, setQbBehavior] = useState<QBBehavior>(initial?.qbBehavior ?? 'normal');
  const [skillBehavior, setSkillBehavior] = useState<SkillBehavior>(initial?.skillBehavior ?? 'normal');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [roster, setRoster] = useState<RankingRoster>(initial?.roster ?? defaultRoster());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRosterField<K extends keyof RankingRoster>(key: K, value: RankingRoster[K]) {
    setRoster((r) => ({ ...r, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSubmitting(true);
    setError(null);

    // Superflex / 2QB lives only in the Modifiers toggle. The data model
    // still tracks qbStarters and superflexSlots separately so future power-user
    // overrides (3QB, multiple SF slots) can be added without a migration.
    const effectiveRoster: RankingRoster = {
      ...roster,
      qbStarters: 1,
      superflexSlots: superflex ? 1 : 0,
    };

    const draft: RankingDraft = {
      name: name.trim(),
      format,
      scoring: { scoringType, tep, sixPointPassTDs: sixPt },
      roster: effectiveRoster,
      teams,
      qbBehavior,
      skillBehavior,
    };

    try {
      const result = initial
        ? await updateRanking(initial.id, draft)
        : await createRanking(draft);
      if (!result) {
        setError('Could not save ranking. Are you signed in?');
        setSubmitting(false);
        return;
      }
      router.push(`/?ranking=${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
          {initial ? 'Edit ranking profile' : 'New ranking profile'}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Describe your league. We&apos;ll tune the rankings to match.
        </p>
      </div>

      <Card title="Basics">
        <Field label="Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My home league"
            required
            style={inputStyle}
          />
        </Field>
        <Field label="League size">
          <Radio
            value={String(teams)}
            onChange={(v) => setTeams(Number(v))}
            options={[
              { value: '8', label: '8' },
              { value: '10', label: '10' },
              { value: '12', label: '12' },
              { value: '14', label: '14' },
              { value: '16', label: '16' },
            ]}
          />
        </Field>
        <Field label="Format">
          <Radio
            value={format}
            onChange={(v) => setFormat(v as RankingFormatType)}
            options={[
              { value: 'redraft_managed', label: 'Managed' },
              { value: 'best_ball', label: 'Best Ball — coming soon', disabled: true },
            ]}
          />
        </Field>
        <Field label="Scoring">
          <Radio
            value={scoringType}
            onChange={(v) => setScoringType(v as ScoringType)}
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'half_ppr', label: '0.5 PPR' },
              { value: 'ppr', label: 'PPR' },
            ]}
          />
        </Field>
        <Field label="Modifiers">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Toggle label="TE Premium" checked={tep} onChange={setTep} />
            <Toggle label="Superflex / 2QB" checked={superflex} onChange={setSuperflex} />
            <Toggle label="6pt Pass TDs" checked={sixPt} onChange={setSixPt} />
          </div>
        </Field>
      </Card>

      <Card title="League behavior">
        <Field
          label="QB market"
          help={'Early = top QBs go in early rounds. Heavy = all QBs including backups get drafted (waiver has no QBs).'}
        >
          <Radio
            value={qbBehavior}
            onChange={(v) => setQbBehavior(v as QBBehavior)}
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'early', label: 'Early' },
              { value: 'heavy', label: 'Heavy' },
              { value: 'early_and_heavy', label: 'Early + Heavy' },
            ]}
          />
        </Field>
        <Field
          label="Skill positions"
          help={'RB-Heavy = bell-cow RBs drafted aggressively. Zero-RB = drafters wait on RBs.'}
        >
          <Radio
            value={skillBehavior}
            onChange={(v) => setSkillBehavior(v as SkillBehavior)}
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'rb_heavy', label: 'RB-Heavy' },
              { value: 'zero_rb', label: 'Zero-RB' },
            ]}
          />
        </Field>
      </Card>

      <div className="card" style={{ padding: '14px 16px' }}>
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            width: '100%',
          }}
        >
          <span style={{ transition: 'transform 0.15s', transform: advancedOpen ? 'rotate(90deg)' : 'none' }}>›</span>
          Advanced settings
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
            roster, flex, bench
          </span>
        </button>
        {advancedOpen && (
          <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <NumberRow label="RB starters" value={roster.rbStarters} min={0} max={4} onChange={(v) => updateRosterField('rbStarters', v)} />
            <NumberRow label="WR starters" value={roster.wrStarters} min={0} max={5} onChange={(v) => updateRosterField('wrStarters', v)} />
            <NumberRow label="TE starters" value={roster.teStarters} min={0} max={3} onChange={(v) => updateRosterField('teStarters', v)} />
            <NumberRow label="Flex slots" value={roster.flexSlots} min={0} max={3} onChange={(v) => updateRosterField('flexSlots', v)} />
            <NumberRow label="Bench size" value={roster.benchSize} min={0} max={20} onChange={(v) => updateRosterField('benchSize', v)} />
          </div>
        )}
      </div>

      {error && (
        <div style={{ color: 'var(--color-delta-down)', fontSize: '13px' }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Cancel
        </button>
        <button type="submit" className="btn-brand" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Create profile'}
        </button>
      </div>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="label-caps">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</label>
      {children}
      {help && <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>{help}</div>}
    </div>
  );
}

function Radio<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; disabled?: boolean }[];
}) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={opt.disabled}
            onClick={() => !opt.disabled && onChange(opt.value)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              borderRadius: '6px',
              cursor: opt.disabled ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              border: isActive ? '0.5px solid var(--color-brand)' : '0.5px solid var(--color-border-medium)',
              background: isActive ? 'var(--color-brand)' : 'transparent',
              color: isActive ? '#12120F' : opt.disabled ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
              opacity: opt.disabled ? 0.5 : 1,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px 10px',
        borderRadius: '6px',
        border: checked ? '0.5px solid var(--color-brand)' : '0.5px solid var(--color-border-medium)',
        cursor: 'pointer',
        background: 'transparent',
        fontSize: '12px',
        color: checked ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        fontFamily: 'inherit',
      }}
    >
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: checked ? 'var(--color-brand)' : 'var(--color-border-medium)',
      }} />
      {label}
    </button>
  );
}

function NumberRow({
  label, value, min, max, onChange,
}: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <label style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ...inputStyle, width: '70px', textAlign: 'right' }}
      />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--color-bg-tertiary)',
  border: '0.5px solid var(--color-border-medium)',
  borderRadius: '6px',
  padding: '7px 10px',
  fontSize: '13px',
  color: 'var(--color-text-primary)',
  fontFamily: 'inherit',
  outline: 'none',
};
