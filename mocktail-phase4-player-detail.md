# Phase 4 — Player Detail Page & Projection Form

## Overview

Phase 4 redesigns the player detail page with a minimal branded header, a hero card, news card, projection form, and historical stats table.

---

## Key Decisions

| Decision | Choice |
|---|---|
| Player page header | Minimal sticky header using shared `<LogoBlock />` (no nav items) |
| Back link | Inline in page content above hero card |
| Hero projected pts | Last season actual pts (`<LastSeasonPts />`, scoring-type-aware) |
| Live projected pts | Projection form footer only (updates in real time) |
| Logo extraction | `LogoBlock` component shared between `NavHeader` and player page |
| `StatInput` modified prop | `isDefault` (inverse of modified); unchanged from pre-Phase 4 |
| Avatar size | 56px circle (`borderRadius: '50%'`) |

---

## Files Changed

| File | Change |
|---|---|
| `apps/web/app/_components/LogoBlock.tsx` | Created — shared branded logo block |
| `apps/web/app/_components/NavHeader.tsx` | Updated to use `<LogoBlock />` |
| `apps/web/app/players/[id]/page.tsx` | Rewritten — minimal header, hero card, token bg, `<PositionBadge />` |
| `apps/web/app/players/[id]/_components/PlayerAvatar.tsx` | 56px circle, token fallback colors |
| `apps/web/app/players/[id]/_components/LastSeasonPts.tsx` | 28px brand orange pts, season year label |
| `apps/web/app/players/[id]/_components/PositionTabs.tsx` | Added `season` prop, removed "2026 Projection" heading, restyled label |
| `apps/web/app/players/[id]/_components/ProjectionForm.tsx` | Card header + baseline badge, restyled inputs, new footer |
| `apps/web/app/players/[id]/_components/NewsCard.tsx` | "Latest news" in brand orange, token colors |
| `apps/web/app/players/[id]/_components/HistoricalStatsTable.tsx` | Token colors, `.card` container, row hover, removed alternating bg |

---

## Component Details

### LogoBlock.tsx

Shared between `NavHeader` and the player page minimal header:

```tsx
export default function LogoBlock() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '28px', height: '28px',
        background: 'var(--color-brand)', borderRadius: '6px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: '14px', fontWeight: 500, flexShrink: 0,
      }}>M</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>Mocktail</span>
        <span className="hidden sm:block" style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', lineHeight: 1.2 }}>
          Your projections. Your rankings.
        </span>
      </div>
    </div>
  );
}
```

### page.tsx structure

- `<main>` bg: `var(--color-bg-secondary)`
- Minimal sticky header (52px): `<LogoBlock />` only
- Content: max-width 720px, padding 24px 16px, gap 12px
- Back link inline above hero card
- Hero `.card`: header zone (56px avatar + name/meta + `<LastSeasonPts />`) + position-aware stats bar
- Stats bar cells per position:
  - QB: Pass Yds / Pass TDs / INT / Rush Yds / Rush TDs (conditional on `> 0`)
  - RB: Rush Yds / Rush TDs / Rec / Rec Yds / Rec TDs (conditional)
  - WR/TE: Rec / Rec Yds / Rec TDs (conditional)
  - Stats bar hidden if all values are zero
- `<NewsCard />` if `playerSummary` present
- `<PositionTabs />` with `season={currentNFLSeason()}`

### ProjectionForm.tsx structure

Card sections:
1. **Header** (bg-secondary, border-bottom): "Your {season} projection" title + subtitle + "Baseline: {season-1} season" badge using `--color-baseline-*` tokens
2. **Body** (padding 16px): stat sections (Passing/Receiving/Rushing/Misc) using `space-y-6`
3. **Footer** (bg-secondary, border-top): 22px brand pts + scoring label + `btn-brand` save button

`StatInput` states:
- `isDefault=true`: white bg, `--color-border-medium`, `--color-text-secondary` text
- `isDefault=false`: `--color-input-modified-bg` tint, `--color-input-modified-border`, `--color-text-primary` text

### HistoricalStatsTable.tsx

- Container: `.card` with `overflow: hidden` + inner `overflowX: auto` div
- Header row: `var(--color-bg-secondary)` bg, `0.5px solid var(--color-border-light)` bottom border
- Header labels: `var(--color-text-tertiary)`, 10px, uppercase, weight 500
- Data cells: `var(--color-text-primary)` primary stats, `var(--color-text-secondary)` secondary (games played, fumbles)
- Pts column: `var(--color-brand)`, weight 500
- Row borders: `0.5px solid var(--color-border-light)` (no alternating bg)
- Row hover: `hover:bg-[var(--color-bg-secondary)]`

---

## Verification

1. `pnpm turbo type-check --filter=@mocktail/web` — passes ✓
2. Player page: minimal header (logo + tagline, no nav)
3. Back link inline above hero card
4. Hero card: 56px circle avatar, name, team · badge · age, last season pts (28px orange), stats bar
5. News card: "Latest news" in brand orange, timestamp, body text, sources toggle
6. Projection form: card header with baseline badge, inputs tinted when modified, live pts footer
7. Save button shows "Saved ✓" for 2s
8. Historical stats: token colors, pts column orange, row hover, no alternating rows
