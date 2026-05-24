'use client';

import type { PositionBaselines, RankingConfig } from '@mocktail/core';

const MODE_RATIONALE: Record<PositionBaselines['mode'], string> = {
  VOLS: 'Managed leagues use VOLS — baseline is the last weekly starter at each position.',
  VORP_DEEP: 'Best Ball uses a VORP-style deep baseline because bench points actually score.',
};

function scoringLabel(c: RankingConfig): string {
  const base = c.scoring.scoringType === 'half_ppr' ? '0.5 PPR' : c.scoring.scoringType === 'ppr' ? 'PPR' : 'Standard';
  const mods = [c.scoring.tep ? 'TEP' : null, c.scoring.sixPointPassTDs ? '6pt Pass' : null].filter(Boolean);
  return mods.length ? `${base} • ${mods.join(' • ')}` : base;
}

function behaviorLabel(c: RankingConfig): string | null {
  const qb = c.qbBehavior === 'normal' ? null : c.qbBehavior === 'early_and_heavy' ? 'QB Early+Heavy' : `QB ${c.qbBehavior === 'early' ? 'Early' : 'Heavy'}`;
  const skill = c.skillBehavior === 'normal' ? null : c.skillBehavior === 'rb_heavy' ? 'RB-Heavy' : 'Zero-RB';
  const parts = [qb, skill].filter(Boolean);
  return parts.length ? parts.join(' • ') : null;
}

export default function RankingAboutPanel({ config, baselines }: { config: RankingConfig; baselines: PositionBaselines }) {
  const behavior = behaviorLabel(config);
  return (
    <div
      className="card"
      style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
    >
      <div>
        <div className="label-caps" style={{ marginBottom: '4px' }}>About this profile</div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{config.name}</div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
          {config.teams} teams • {config.format === 'best_ball' ? 'Best Ball' : 'Managed'} • {scoringLabel(config)}
          {behavior && <> • {behavior}</>}
        </div>
      </div>

      <div>
        <div className="label-caps" style={{ marginBottom: '6px' }}>Position baselines</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 1fr',
            gap: '4px 16px',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
          }}
        >
          <div style={{ color: 'var(--color-text-tertiary)' }}>Pos</div>
          <div style={{ color: 'var(--color-text-tertiary)', textAlign: 'right' }}>Depth (rank)</div>
          <div style={{ color: 'var(--color-text-tertiary)', textAlign: 'right' }}>Baseline pts</div>
          {(['QB', 'RB', 'WR', 'TE'] as const).map((pos) => (
            <>
              <div key={`${pos}-l`} style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{pos}</div>
              <div key={`${pos}-d`} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{baselines.depths[pos]}</div>
              <div key={`${pos}-v`} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{baselines.values[pos].toFixed(1)}</div>
            </>
          ))}
        </div>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>
        {MODE_RATIONALE[baselines.mode]}
      </div>
    </div>
  );
}
