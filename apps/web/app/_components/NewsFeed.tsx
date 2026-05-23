'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { NewsItem } from '@mocktail/core';

const DEFAULT_INITIAL = 5;
const DEFAULT_EXPANDED = 20;

// Categories worth surfacing as chips. "Commentary" / "News" tag every item and
// are noise; hide them.
const PROMOTED_CATEGORIES = ['Injury', 'Breaking', 'Transaction', 'Rumor', 'Recap'] as const;
type PromotedCategory = (typeof PROMOTED_CATEGORIES)[number];

const CATEGORY_STYLES: Record<PromotedCategory, { bg: string; color: string }> = {
  Injury:      { bg: 'var(--color-delta-down-bg)', color: 'var(--color-delta-down)' },
  Breaking:    { bg: 'var(--color-brand-subtle)',  color: 'var(--color-brand)'      },
  Transaction: { bg: 'rgba(180, 200, 255, 0.12)',  color: '#9FBAFF'                 },
  Rumor:       { bg: 'rgba(255, 200, 120, 0.12)',  color: '#FFC878'                 },
  Recap:       { bg: 'rgba(255,255,255,0.08)',     color: 'var(--color-text-secondary)' },
};

function promotedCategories(item: NewsItem): PromotedCategory[] {
  return item.categories.filter((c): c is PromotedCategory =>
    (PROMOTED_CATEGORIES as readonly string[]).includes(c)
  );
}

function relativeTime(created: string): string {
  // FP timestamps are 'YYYY-MM-DD HH:MM:SS' UTC. Parse explicitly to avoid local-tz drift.
  const iso = created.replace(' ', 'T') + 'Z';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'just now';
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${Math.max(1, min)}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  return `${w}w ago`;
}

function CategoryChip({ category }: { category: PromotedCategory }) {
  const style = CATEGORY_STYLES[category];
  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        fontSize: '10px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        padding: '2px 6px',
        borderRadius: '3px',
      }}
    >
      {category}
    </span>
  );
}

const FP_TEAM_DISPLAY: Record<string, string> = { LAR: 'LA', JAC: 'JAX' };

function NewsItemRow({ item, playerEntry }: { item: NewsItem; playerEntry?: { name: string; id: string } }) {
  const chips = promotedCategories(item);
  return (
    <li style={{ padding: '12px 0', borderTop: '0.5px solid var(--color-border-light)' }}>
      {playerEntry && (
        <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Link
            href={`/players/${playerEntry.id}`}
            style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', textDecoration: 'none' }}
          >
            {playerEntry.name}
          </Link>
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            {FP_TEAM_DISPLAY[item.team_id] ?? item.team_id}
          </span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
        {chips.map((c) => <CategoryChip key={c} category={c} />)}
        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
          {relativeTime(item.created)}
        </span>
        {item.author && (
          <>
            <span style={{ color: 'var(--color-border-medium)', fontSize: '11px' }}>·</span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{item.author}</span>
          </>
        )}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.4, marginBottom: '4px' }}>
        {item.desc || item.title}
      </div>
      {item.impact && (
        <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', lineHeight: 1.55, marginBottom: '6px' }}>
          {item.impact}
        </div>
      )}
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textDecoration: 'underline' }}
      >
        Read at FantasyPros ↗
      </a>
    </li>
  );
}

export default function NewsFeed({
  items,
  title = 'Latest news',
  initialCount = DEFAULT_INITIAL,
  expandedCount = DEFAULT_EXPANDED,
  showCategoryFilter = false,
  bare = false,
  collapsible = false,
  playerMap,
}: {
  items: NewsItem[];
  title?: string;
  initialCount?: number;
  expandedCount?: number;
  showCategoryFilter?: boolean;
  /** Skip the outer .card wrapper — use when nested inside another card. */
  bare?: boolean;
  /** Render collapsed by default; clicking the header row expands the feed. */
  collapsible?: boolean;
  /** When provided, renders player name + link above each item. */
  playerMap?: Record<number, { name: string; id: string }>;
}) {
  const [open, setOpen] = useState(!collapsible);
  const [expanded, setExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<PromotedCategory | 'All'>('All');

  // Filter chips to render (only ones present in this feed) — keeps UI honest.
  const presentCategories = useMemo<PromotedCategory[]>(() => {
    const seen = new Set<PromotedCategory>();
    for (const i of items) for (const c of promotedCategories(i)) seen.add(c);
    return PROMOTED_CATEGORIES.filter((c) => seen.has(c));
  }, [items]);

  const filtered = useMemo(() => {
    if (activeFilter === 'All') return items;
    return items.filter((i) => promotedCategories(i).includes(activeFilter));
  }, [items, activeFilter]);

  if (items.length === 0) return null;

  const limit = expanded ? expandedCount : initialCount;
  const visible = filtered.slice(0, limit);
  const hiddenCount = Math.min(filtered.length, expandedCount) - visible.length;

  const headerRow = (
    <div
      role={collapsible ? 'button' : undefined}
      tabIndex={collapsible ? 0 : undefined}
      onClick={collapsible ? () => { setOpen((v) => !v); } : undefined}
      onKeyDown={collapsible ? (e) => { if (e.key === 'Enter' || e.key === ' ') setOpen((v) => !v); } : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: collapsible ? 'pointer' : 'default',
        marginBottom: open && showCategoryFilter && presentCategories.length > 0 ? '10px' : open ? '4px' : 0,
      }}
    >
      <span style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-brand)' }}>
        {title}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
        {collapsible && (
          <svg
            style={{ width: '12px', height: '12px', color: 'var(--color-text-tertiary)', transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'none', flexShrink: 0 }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </div>
  );

  return (
    <div className={bare ? '' : 'card'} style={bare ? undefined : { padding: '14px 16px' }}>
      {headerRow}

      {open && (
        <>
          {showCategoryFilter && presentCategories.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
              {(['All', ...presentCategories] as const).map((c) => {
                const isActive = activeFilter === c;
                return (
                  <button
                    key={c}
                    onClick={() => { setActiveFilter(c); setExpanded(false); }}
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '3px 8px',
                      borderRadius: '3px',
                      border: '0.5px solid ' + (isActive ? 'var(--color-brand)' : 'var(--color-border-medium)'),
                      background: isActive ? 'var(--color-brand-subtle)' : 'transparent',
                      color: isActive ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          )}

          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {visible.map((item) => <NewsItemRow key={item.id} item={item} playerEntry={playerMap?.[item.player_id]} />)}
          </ul>

          {hiddenCount > 0 && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              style={{
                marginTop: '10px',
                fontSize: '11px',
                color: 'var(--color-text-secondary)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textDecoration: 'underline',
              }}
            >
              Show more ({hiddenCount})
            </button>
          )}
          {expanded && filtered.length > initialCount && (
            <button
              onClick={() => setExpanded(false)}
              style={{
                marginTop: '10px',
                fontSize: '11px',
                color: 'var(--color-text-secondary)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textDecoration: 'underline',
              }}
            >
              Show less
            </button>
          )}

          {filtered.length === 0 && activeFilter !== 'All' && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', padding: '8px 0' }}>
              No {activeFilter} items in the last 30 days.
            </div>
          )}
        </>
      )}
    </div>
  );
}
