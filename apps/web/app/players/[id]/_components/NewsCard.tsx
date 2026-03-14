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
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold uppercase tracking-widest text-gray-400">News</span>
        <span className="text-xs text-gray-400">{relativeTime(summary.generated_at)}</span>
      </div>
      <p className="text-base leading-relaxed text-gray-700">{summary.summary}</p>
      {summary.sources.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowSources((v) => !v)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className={`h-3 w-3 transition-transform ${showSources ? 'rotate-90' : ''}`}
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
            <ul className="mt-2 space-y-1">
              {summary.sources.map((url, i) => (
                <li key={i}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-500 underline hover:text-gray-700 transition-colors"
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
