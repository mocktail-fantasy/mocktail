# Phase 1 — Design Tokens & Global Styles

## Objective

Create a single source of truth for all design values: colors, typography, spacing, and shared component primitives. No component UI is changed in this phase. The output is an updated `globals.css` and a shared `PositionBadge` component that every other phase builds on.

---

## Context

This is a **Next.js 16 App Router + TypeScript + Tailwind CSS v4** project. Tailwind v4 is zero-config — there is no `tailwind.config.js`. Design tokens are registered via `@theme {}` in `globals.css`, and shared component classes via `@layer components {}` in the same file. All CSS is imported through `apps/web/app/globals.css`, which is already imported in `layout.tsx`.

---

## Step 1 — Update globals.css

**File:** `apps/web/app/globals.css`

Replace the entire file with:

```css
@import "tailwindcss";

/* ─────────────────────────────────────────
   Design Tokens — registered as Tailwind
   CSS variables via @theme
───────────────────────────────────────── */
@theme {
  /* Brand */
  --color-brand:        #E8593C;
  --color-brand-hover:  #D14B30;
  --color-brand-subtle: #FAECE7;
  --color-brand-border: #F0C4B8;

  /* Backgrounds */
  --color-bg-primary:   #FFFFFF;
  --color-bg-secondary: #F5F4F1;
  --color-bg-tertiary:  #EEECE8;

  /* Text */
  --color-text-primary:   #1A1A18;
  --color-text-secondary: #5C5B57;
  --color-text-tertiary:  #9C9A92;

  /* Borders */
  --color-border-light:  rgba(0, 0, 0, 0.08);
  --color-border-medium: rgba(0, 0, 0, 0.14);
  --color-border-strong: rgba(0, 0, 0, 0.22);

  /* Position badge colors */
  --color-pos-rb-bg:   #EAF3DE;
  --color-pos-rb-text: #3B6D11;
  --color-pos-wr-bg:   #E6F1FB;
  --color-pos-wr-text: #185FA5;
  --color-pos-qb-bg:   #FAEEDA;
  --color-pos-qb-text: #854F0B;
  --color-pos-te-bg:   #FBEAF0;
  --color-pos-te-text: #993556;

  /* Semantic delta colors */
  --color-delta-up:      #3B6D11;
  --color-delta-down:    #A32D2D;
  --color-delta-up-bg:   #EAF3DE;
  --color-delta-down-bg: #FCEBEB;

  /* Projection form */
  --color-baseline-bg:           #FAEEDA;
  --color-baseline-text:         #854F0B;
  --color-baseline-border:       #FAC775;
  --color-input-modified-bg:     #FAECE7;
  --color-input-modified-border: #E8593C;

  /* Typography scale */
  --font-size-hero:    22px;
  --font-size-section: 18px;
  --font-size-lg:      16px;
  --font-size-body:    14px;
  --font-size-sm:      13px;
  --font-size-xs:      12px;
  --font-size-2xs:     11px;
  --font-size-label:   10px;

  /* Font weights */
  --font-weight-regular: 400;
  --font-weight-medium:  500;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  /* Border radius */
  --radius-sm:   4px;
  --radius-md:   6px;
  --radius-lg:   10px;
  --radius-xl:   14px;
  --radius-full: 9999px;

  /* Rank number sizes */
  --rank-size-top:     22px;
  --rank-size-default: 18px;

  /* Letter spacing */
  --tracking-wide:  0.06em;
  --tracking-wider: 0.08em;
}

/* ─────────────────────────────────────────
   Shared component primitives
───────────────────────────────────────── */
@layer components {

  /* Position badges */
  .badge-pos {
    display: inline-block;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-label);
    font-weight: var(--font-weight-medium);
    letter-spacing: 0.04em;
    line-height: 1.4;
  }
  .badge-pos-RB { background: var(--color-pos-rb-bg); color: var(--color-pos-rb-text); }
  .badge-pos-WR { background: var(--color-pos-wr-bg); color: var(--color-pos-wr-text); }
  .badge-pos-QB { background: var(--color-pos-qb-bg); color: var(--color-pos-qb-text); }
  .badge-pos-TE { background: var(--color-pos-te-bg); color: var(--color-pos-te-text); }

  /* Section label (uppercase category heading) */
  .label-caps {
    font-size: var(--font-size-label);
    font-weight: var(--font-weight-medium);
    text-transform: uppercase;
    letter-spacing: var(--tracking-wider);
    color: var(--color-text-tertiary);
  }

  /* Brand button */
  .btn-brand {
    padding: 8px 16px;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    background: var(--color-brand);
    color: #fff;
    border: none;
    cursor: pointer;
    transition: opacity 0.15s;
    font-family: inherit;
  }
  .btn-brand:hover  { opacity: 0.88; }
  .btn-brand:active { opacity: 0.78; }

  /* Ghost button */
  .btn-ghost {
    padding: 5px 12px;
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    background: transparent;
    color: var(--color-text-secondary);
    border: 0.5px solid var(--color-border-medium);
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }
  .btn-ghost:hover { color: var(--color-text-primary); border-color: var(--color-border-strong); }
  .btn-ghost.active {
    background: var(--color-text-primary);
    color: var(--color-bg-primary);
    border-color: var(--color-text-primary);
  }

  /* Card */
  .card {
    background: var(--color-bg-primary);
    border: 0.5px solid var(--color-border-light);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  /* Dividers */
  .divider-h {
    width: 100%;
    height: 0;
    border: none;
    border-top: 0.5px solid var(--color-border-light);
  }
  .divider-v {
    width: 0;
    height: 20px;
    border: none;
    border-left: 0.5px solid var(--color-border-light);
  }

  /* Projected points display */
  .pts-value {
    color: var(--color-brand);
    font-variant-numeric: tabular-nums;
    font-weight: var(--font-weight-medium);
  }

  /* News indicator dot */
  .news-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-brand);
    margin-left: 4px;
    vertical-align: middle;
    flex-shrink: 0;
  }

  /* Delta indicators */
  .delta-up   { color: var(--color-delta-up); }
  .delta-down { color: var(--color-delta-down); }

  /* Tabular numbers */
  .tabular-nums { font-variant-numeric: tabular-nums; }
}
```

No separate import step — `globals.css` is already imported in `layout.tsx`.

---

## Step 2 — Update layout.tsx body classes

**File:** `apps/web/app/layout.tsx`

Update the `<body>` to use token-based background and text colors instead of Tailwind's default gray classes:

```tsx
// Before
className={`${geist.variable} font-[family-name:var(--font-geist)] antialiased bg-gray-50 text-gray-900 min-h-screen`}

// After
className={`${geist.variable} font-[family-name:var(--font-geist)] antialiased min-h-screen`}
style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
```

---

## Step 3 — Create a shared PositionBadge component

**File:** `apps/web/app/_components/PositionBadge.tsx`

```tsx
import type { Position } from '@mocktail/core';

export default function PositionBadge({ position }: { position: Position }) {
  return (
    <span className={`badge-pos badge-pos-${position}`}>
      {position}
    </span>
  );
}
```

This consolidates the duplicate `POSITION_STYLES` objects currently in `PlayerCard.tsx` and the player detail page. Subsequent phases will replace those inline styles with this component.

---

## Verification

After completing all steps:

1. `pnpm turbo dev --filter=@mocktail/web` — app starts without errors
2. App visually looks nearly identical — background shifts slightly warmer (#F5F4F1), no other visible changes
3. `pnpm turbo type-check --filter=@mocktail/web` — no TypeScript errors
4. DevTools → Elements: `:root` shows all `--color-*`, `--font-size-*`, etc. variables
5. Smoke test: drop `<PositionBadge position="RB" />` into any page — renders a small green pill with "RB"

---

## Files Created or Modified in This Phase

| File | Action |
|---|---|
| `apps/web/app/globals.css` | Modified — adds `@theme` block + `@layer components` |
| `apps/web/app/layout.tsx` | Modified — updates body bg/text to token vars |
| `apps/web/app/_components/PositionBadge.tsx` | Created |

**Do not modify any page files, other layout files, or other components in this phase.**
