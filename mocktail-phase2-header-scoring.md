# Phase 2 — Header, Navigation & Scoring Settings

## Objective

Redesign the persistent app header and introduce a dedicated scoring settings panel. After this phase, every page will:
- Show a minimal header: orange "M" square lettermark + "Mocktail" name + tagline + nav items with orange active underline
- Have no scoring controls in the header
- On the Rankings page only: show a scoring panel below the header with clearly labeled groups

---

## Context

Next.js 16 App Router + TypeScript + Tailwind CSS v4. Design tokens from Phase 1 are available as CSS custom properties.

Key files:
- `apps/web/app/_components/NavHeader.tsx` — the header component, used on all pages via `activePage` prop
- `apps/web/app/_components/ScoringContext.tsx` — context exposing `scoringType`/`setScoringType`, `tep`/`setTep`, `twoQB`/`setTwoQB`, `sixPtPass`/`setSixPtPass`
- `apps/web/app/page.tsx` — Rankings page; renders NavHeader + RosterGrid

localStorage keys (do not change): `scoring_type`, `scoring_tep`, `scoring_two_qb`, `scoring_six_pt_pass`

---

## Part A — Header & Navigation

### Target structure

```
┌─────────────────────────────────────────────────────────────────┐
│  [M]  Mocktail          │  Rankings  Teams  Free Agents         │
│       Your projections. │                                       │
│       Your rankings.    │                                       │
└─────────────────────────────────────────────────────────────────┘
```

- Fixed height: `52px`
- Background: `var(--color-bg-primary)` (white)
- Bottom border: `0.5px solid var(--color-border-light)`
- Position: `sticky`, `top: 0`, `z-index: 100`
- No box-shadow

### Logo block

Orange 28×28px rounded square with "M", right-bordered divider, "Mocktail" name (15px, weight 500), tagline hidden on mobile.

### Nav items

Active item: orange bottom border `2px solid var(--color-brand)`, `color-text-primary`, weight 500.
Inactive items: `color-text-secondary`, weight 400, transparent bottom border.

Use the existing `activePage` prop (not `usePathname()`). On mobile, show short labels (Rnk / Tm / FA).

### Full header component

**File:** `apps/web/app/_components/NavHeader.tsx`

No scoring controls. No `useScoringType` import. No `next/image` import.

---

## Part B — Scoring Settings Panel

### Problem being solved

Scoring controls were buried in the header and displayed as a `<select>` + unlabeled text buttons. The redesign makes them clearly labeled and visually interactive.

### Target structure

```
SCORING  [Std] [0.5 PPR] [PPR]  |  MODIFIERS  [● TEP +0.5]  [○ 2QB]  [○ 6pt Pass TD]
```

### Component

**File:** `apps/web/app/_components/ScoringPanel.tsx` (new `'use client'` component)

- Wrapper: `var(--color-bg-secondary)` background, light border, `border-radius: 10px`, `padding: 10px 16px`, flex row with `flexWrap: wrap`
- "SCORING" and "MODIFIERS" group labels: 10px, weight 500, uppercase, `var(--color-text-tertiary)`
- Vertical divider between groups: `0.5px` wide, 20px tall, `var(--color-border-light)`
- Scoring buttons (Std / 0.5 PPR / PPR): active = brand bg + white text + brand border; inactive = transparent bg + `color-text-secondary` + medium border
- Modifier pills (TEP +0.5 / 2QB / 6pt Pass TD): dot indicator 8×8px, orange when active / `color-border-medium` when inactive; pill border turns brand color when active

### Variable mapping (do not rename)

- `scoringType === 'standard'` → Std active
- `scoringType === 'half_ppr'` → 0.5 PPR active
- `scoringType === 'ppr'` → PPR active
- `tep === true` → TEP pill active
- `twoQB === true` → 2QB pill active
- `sixPtPass === true` → 6pt Pass TD pill active

### Placement

Scoring panel renders in `apps/web/app/page.tsx` (Rankings page only), between the NavHeader and RosterGrid. It does NOT appear on Teams or Free Agents pages.

---

## Part C — Mobile behavior

- Tagline hidden on screens < `sm` breakpoint (`hidden sm:block`)
- Nav items show short labels on mobile: Rnk / Tm / FA (existing pattern preserved)
- Scoring panel wraps to two rows via `flexWrap: wrap` (already set)

---

## Files Created or Modified in This Phase

| File | Action |
|---|---|
| `apps/web/app/_components/NavHeader.tsx` | Rewritten — logo block, new nav active style, scoring removed |
| `apps/web/app/_components/ScoringPanel.tsx` | Created — scoring buttons + modifier toggle pills |
| `apps/web/app/page.tsx` | Modified — adds ScoringPanel, updates bg token |
| `apps/web/app/teams/page.tsx` | Modified — updates bg to token |
| `apps/web/app/free-agents/page.tsx` | Modified — updates bg to token |

**Do not modify the fantasy points engine, VORP logic, ScoringContext, or player data.**

---

## Verification

1. `pnpm turbo dev --filter=@mocktail/web` — no errors
2. Header shows orange "M" square, "Mocktail" text, tagline (hidden on mobile), nav items
3. Active nav item has orange bottom underline; inactive items are muted grey
4. Rankings page shows scoring panel below header with "Scoring" and "Modifiers" groups
5. Clicking Std / 0.5 PPR / PPR fills the active button orange, others deactivate
6. Clicking modifier pills toggles the dot indicator orange/grey
7. Scoring calculations update correctly as settings change
8. Refresh preserves all scoring settings (localStorage unchanged)
9. Teams and Free Agents pages: no scoring panel, clean header only
10. `pnpm turbo type-check --filter=@mocktail/web` — no TypeScript errors
