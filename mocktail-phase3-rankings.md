# Phase 3 — Rankings Page

## Objective

Redesign the rankings filter bar and player rows. After this phase the rankings page will have:
- A filter bar with labeled groups ("Filter" / "Ranking") styled to match the scoring panel's label treatment, position chips with ghost/active-black states, a joined ranking mode toggle, and a search input
- Player rows with tiered rank numbers, consolidated name+meta cell (team · position badge · age), a projected stats preview column (desktop only), and projected points in brand orange
- News indicator dot inline after the player name

---

## Context

Next.js 16 App Router + TypeScript + Tailwind CSS v4. Design tokens from Phase 1 in `globals.css`. Scoring panel from Phase 2 sits above the rankings list in `apps/web/app/page.tsx`.

Key files:
- `apps/web/app/_components/PlayerCard.tsx` — individual player row component
- `apps/web/app/_components/RosterGrid.tsx` — filter bar + column headers + player list

Do not change any calculation logic — only the visual presentation.

---

## Part A — Filter Bar

### Target structure

```
Filter                    Ranking
[All][QB][RB][WR][TE]    [Total Points | Smart (VORP)]    [Search player or team…]
```

Group labels match the scoring panel: `10px / uppercase / weight 500 / var(--color-text-tertiary)`.

### Position filter chips

Individual ghost/active-black buttons — no pill container wrapper.

- Inactive: `border: 0.5px solid var(--color-border-medium)`, transparent bg, `var(--color-text-secondary)` text
- Active: `border: 0.5px solid var(--color-text-primary)`, `var(--color-text-primary)` bg, `var(--color-bg-primary)` text

### Ranking mode toggle

Two buttons sharing a border, joined into one control. Active fills black. Existing state variable `rankingMode: 'points' | 'vorp'` — note `'points'` not `'total'`.

### Search input

Token border/bg colors. `onFocus` → border turns `var(--color-brand)`. `onBlur` → border returns to `var(--color-border-medium)`. Existing `search` state and `onChange` handler unchanged.

---

## Part B — Column Layout

### Grid columns

- Mobile: `grid-cols-[40px_minmax(0,1fr)_88px_16px]`
- Desktop: `sm:grid-cols-[40px_minmax(0,1fr)_minmax(0,2fr)_88px_16px]`

Columns: rank | player name+meta | projected stats (hidden mobile) | projected pts | chevron

Previous separate Team / Pos / Age columns are folded into the player name cell.

### Column headers

Same grid. Labels: `10px / uppercase / weight 500 / var(--color-text-tertiary)`. Sticky top-0 with `var(--color-bg-secondary)` background.

Headers: `#` (right-aligned) | `Player` | `Projected stats` (hidden mobile) | `Proj pts` (right-aligned) | empty

---

## Part C — PlayerCard Rows

### Rank cell

- Ranks 1–3: 22px, weight 500, `var(--color-text-primary)`
- Ranks 4+: 18px, weight 400, `var(--color-text-tertiary)`
- `font-variant-numeric: tabular-nums`

### Name + meta cell

Top line: player name 14px weight 500 `var(--color-text-primary)`, with 6px brand-orange dot after name if `hasNews`.

Sub-row (11px, `var(--color-text-tertiary)`): `{team} · <PositionBadge /> · Age {age}`

Use `<PositionBadge />` from Phase 1 — do not use a local `POSITION_STYLES` object.

### Projected stats cell

Existing `ProjStats` logic (unchanged). Output styled as `11px / var(--color-text-tertiary)`. Hidden on mobile.

Position logic:
- QB: `{passYds} pass yds · {passTDs} TD · {ints} INT`
- RB: `{rushYds} rush yds · {rushTDs} TD · {rec} rec`
- WR/TE: `{rec} rec · {recYds} yds · {recTDs} TD`

Stat fields from `PlayerProjection`: `passing_yards`, `passing_tds`, `interceptions`, `rushing_yards`, `rushing_tds`, `receptions`, `receiving_yards`, `receiving_tds`.

### Projected points cell

`15px / weight 500 / var(--color-brand)` when positive; `var(--color-text-tertiary)` when zero. `toFixed(1)` value with `10px / var(--color-text-tertiary)` "pts" label below. Right-aligned. `pointsUnit` is always `'pts'` — VORP only affects sort order, not the displayed value.

### Hover

`hover:bg-[var(--color-bg-secondary)]` Tailwind class on the Link row.

### Removed

- `POSITION_STYLES` local object
- `compact` prop (was dead code — never called)

---

## Part D — Table Container

Replace `rounded-xl border border-gray-200 shadow-sm` with `.card` class from Phase 1.

---

## Part E — Mobile

- "Projected stats" column hidden on mobile (both header and rows use `hidden sm:block`)
- Filter bar `flexWrap: wrap` handles narrow screens
- Search input goes full-width on mobile: `w-full sm:w-auto sm:ml-auto`

---

## Files Modified in This Phase

| File | Action |
|---|---|
| `apps/web/app/_components/PlayerCard.tsx` | Rewritten — new column layout, token colors, PositionBadge, removed compact/POSITION_STYLES |
| `apps/web/app/_components/RosterGrid.tsx` | Modified — filter bar restyled, column headers updated, card container |

**Do not modify: ScoringContext, ScoringPanel, NavHeader, points engine, VORP logic, Teams/Free Agents pages.**

---

## Verification

1. `pnpm turbo dev --filter=@mocktail/web` — no errors
2. Filter bar: "Filter" and "Ranking" labels in 10px uppercase tertiary color
3. Position chips: ghost inactive, solid black active
4. Ranking mode: joined toggle, solid black active
5. Search: brand orange border on focus
6. Rank 1–3: 22px dark; rank 4+: 18px muted grey
7. Player rows: rank | name + news dot + team/badge/age sub-row | stat preview (desktop) | pts in orange | chevron
8. Position badges use `.badge-pos-*` colors from Phase 1
9. Row hover → `var(--color-bg-secondary)`
10. Row click → navigates to player detail
11. Filtering, search, and ranking mode all work correctly
12. `pnpm turbo type-check --filter=@mocktail/web` — no TypeScript errors
