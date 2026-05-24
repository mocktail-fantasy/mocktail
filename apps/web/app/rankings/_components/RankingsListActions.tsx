'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { RankingConfig } from '@mocktail/core';
import { deleteRanking } from '@/lib/rankings-actions';

export default function RankingsListActions({ rankings }: { rankings: RankingConfig[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function onDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await deleteRanking(id);
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {rankings.map((r) => (
        <li key={r.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{r.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
              {summarize(r)}
            </div>
          </div>
          <Link
            href={`/rankings/${r.id}/edit`}
            style={{
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
              padding: '5px 10px',
              borderRadius: '6px',
              border: '0.5px solid var(--color-border-medium)',
            }}
          >
            Edit
          </Link>
          <button
            onClick={() => onDelete(r.id, r.name)}
            disabled={deleting === r.id}
            style={{
              fontSize: '12px',
              color: 'var(--color-delta-down)',
              background: 'transparent',
              padding: '5px 10px',
              borderRadius: '6px',
              border: '0.5px solid var(--color-border-medium)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {deleting === r.id ? 'Deleting…' : 'Delete'}
          </button>
        </li>
      ))}
    </ul>
  );
}

function summarize(r: RankingConfig): string {
  const sf = r.roster.superflexSlots > 0 ? 'SF' : null;
  const scoring = r.scoring.scoringType === 'half_ppr' ? '0.5 PPR' : r.scoring.scoringType === 'ppr' ? 'PPR' : 'STD';
  const tep = r.scoring.tep ? 'TEP' : null;
  const parts = [`${r.teams} teams`, scoring, sf, tep].filter(Boolean);
  return parts.join(' • ');
}
