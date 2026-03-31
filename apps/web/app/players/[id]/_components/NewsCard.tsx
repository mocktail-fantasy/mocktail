'use client';

import { useState } from 'react';
import type { PlayerSummary } from '@mocktail/core';

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function sourceLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function NewsCard({ summary }: { summary: PlayerSummary }) {
  const [showSources, setShowSources] = useState(false);

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '10px',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--color-brand)',
        }}>
          Latest news
        </span>
        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
          {relativeTime(summary.generated_at)}
        </span>
      </div>
      <p style={{ fontSize: '13px', lineHeight: 1.55, color: 'var(--color-text-secondary)' }}>
        {summary.summary}
      </p>
      {summary.sources.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={() => setShowSources((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: 'var(--color-text-tertiary)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <svg
              style={{
                width: '10px',
                height: '10px',
                transition: 'transform 0.15s',
                transform: showSources ? 'rotate(90deg)' : 'none',
                flexShrink: 0,
              }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {showSources ? 'Hide sources' : `Show sources (${summary.sources.length})`}
          </button>
          {showSources && (
            <ul style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', listStyle: 'none', padding: 0 }}>
              {summary.sources.map((url, i) => (
                <li key={i}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textDecoration: 'underline' }}
                  >
                    {sourceLabel(url)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
