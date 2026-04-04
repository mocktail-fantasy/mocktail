# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

From the repo root:

```bash
pnpm dev          # Start all apps in dev mode (runs apps/web on :3000)
pnpm build        # Build all apps and packages
pnpm type-check   # Run TypeScript type-check across all packages
pnpm lint         # Run ESLint across all packages
```

To run a single app or package, use the `--filter` flag:
```bash
pnpm turbo dev --filter=@mocktail/web
pnpm turbo type-check --filter=@mocktail/core
```

## Architecture

This is a **Turborepo** monorepo with two workspaces:

```
apps/web/         Next.js 15 (App Router) — the web application
packages/core/    Shared TypeScript: types, scoring engine, data utilities
```

### packages/core

All business logic lives here and is imported by `apps/web` (and future `apps/mobile`). Next.js transpiles it directly via `transpilePackages: ['@mocktail/core']` — no build step needed.

Key exports:
- `types/index.ts` — all TypeScript interfaces (`Player`, `PlayerHistory`, `SeasonStats`, `PlayerProjection`, `ScoringSettings`, etc.)
- `scoring/engine.ts` — `calculateFantasyPoints(projection, positions, settings)` — supports Standard, 0.5PPR, PPR, TEP, and 6ptPassTDs
- `scoring/vorp.ts` — VORP calculation with configurable replacement ranks and 2QB support
- `utils/defaults.ts` — `getDefaultProjection(seasons, minSeason?)` and `getDefaultFantasyPoints(seasons, minSeason?)` for pre-filling forms from historical data

### apps/web

Standard Next.js 15 App Router structure. Static data files are in `apps/web/public/`:
- `active_rosters.json` — flat array of active NFL players
- `historical_data.json` — seasonal stats keyed by `player_id`
- `team_history.json` — per-team player stats for the previous season
- `player_summaries.json` — AI-generated news summaries keyed by `player_id`
- `team_summaries.json` — team-level summary data
- `teams.json` — team metadata: colors, logos

All data is loaded **server-side** via `fs.readFileSync` in `apps/web/lib/data.ts` — not client-side fetch. This pattern is designed to swap to S3/CloudFront fetches in production without changing consumer code.

User projections are persisted to `localStorage` (keyed by `projection_{player_id}`).

## Routes

| Route | Page file | Description |
|---|---|---|
| `/` | `app/page.tsx` | Rankings — player list sorted by VORP or projected pts |
| `/teams` | `app/teams/page.tsx` | Team roster viewer with projection entry; defaults to BUF |
| `/free-agents` | `app/free-agents/page.tsx` | FA players — uses `TeamsView` with `fixedTeam="FA"` |
| `/players/[id]` | `app/players/[id]/page.tsx` | Player detail: hero card, news, projection form, historical stats |

## Component Map (`apps/web/app/`)

```
_components/
  LogoBlock.tsx        — shared logo + wordmark used in NavHeader and player page header
  NavHeader.tsx        — persistent nav with LogoBlock, nav links, scoring panel
  ScoringPanel.tsx     — STD / 0.5 PPR / PPR toggles + TEP / 2QB / 6pt Pass modifiers
  ScoringContext.tsx   — global scoring state provider (wraps root layout)
  RosterGrid.tsx       — rankings list with position filter, search, VORP/pts toggle
  PlayerCard.tsx       — individual player row in RosterGrid
  PositionBadge.tsx    — colored position chip (QB/RB/WR/TE)

teams/_components/
  TeamsView.tsx        — team selector + summary card + position roster tables

players/[id]/_components/
  PlayerAvatar.tsx     — 56px circle avatar with initials fallback
  LastSeasonPts.tsx    — last season pts display (brand color, top-right of hero card)
  NewsCard.tsx         — news summary with timestamp and collapsible sources
  PositionTabs.tsx     — tab switcher: Projection Form | Historical Stats
  ProjectionForm.tsx   — stat input form with live pts calculation and save
  HistoricalStatsTable.tsx — per-season stats table
```

## Data Loading (`apps/web/lib/data.ts`)

- `currentNFLSeason()` — derives current NFL season year from kickoff date logic
- `getAllDefaultProjections()` / `getAllDefaultPoints()` — pre-computes defaults for all players at request time; passed as server-rendered props to client components
- `minSeason` is set to `currentNFLSeason()` — players without current-year data show zero defaults and rank at the bottom

## Scoring Engine (`packages/core/scoring/engine.ts`)

`calculateFantasyPoints(projection, positions, settings)` — accepts a unified `PlayerProjection`, an array of `Position` strings, and a `ScoringSettings` object.

### Scoring Rules

| Stat | Points |
|---|---|
| Rushing / Receiving TD | 6 pts |
| Passing TD | 4 pts (6 pts if `sixPointPassTDs`) |
| Rushing / Receiving Yards | 0.10 pts/yd |
| Passing Yards | 0.04 pts/yd |
| Reception | 0 (standard) / 0.5 (half_ppr) / 1.0 (ppr) |
| Reception (TE w/ TEP) | above + 0.5 additional |
| Interception | -2 pts |
| Fumble Lost | -2 pts |

TEP: `positions.includes('TE') && settings.tep` adds +0.5/reception on top of the base PPR value.

`DEFAULT_SCORING`: `{ scoringType: 'standard', tep: false, sixPointPassTDs: false }`

### Historical Points and Scoring Format

`SeasonStats` stores both `fantasy_points` (standard) and `fantasy_points_ppr` (PPR) pre-computed in the data. Half-PPR historical points: `(fantasy_points + fantasy_points_ppr) / 2` — exact because the only difference is 0.5 pts × receptions.

`TeamHistoryPlayer` only has `fantasy_points`; team view historical points are recalculated live via `calculateFantasyPoints` using raw stat fields.

## VORP Rankings (`packages/core/scoring/vorp.ts`)

- `REPLACEMENT_RANKS`: QB=12, RB=40, WR=50, TE=12
- `calculateVORPBaselines(players, projectedPoints, twoQB?)` — for each position, sorts players by projected points and takes the score at the replacement index as baseline
- `calculateVORP(playerPoints, position, baselines)` — player score minus position baseline
- `twoQB`: when true, QB replacement index becomes 32 (two QBs per team × 16 teams); affects only VORP baselines, not point totals

## Global Scoring State (`apps/web/app/_components/ScoringContext.tsx`)

`ScoringProvider` wraps the root layout; all pages access settings via `useScoringType()` hook.

Exposes: `scoringType`, `setScoringType`, `tep`, `setTep`, `twoQB`, `setTwoQB`, `sixPtPass`, `setSixPtPass`, `scoringSettings`

`scoringSettings` is a derived `ScoringSettings` object passed directly to the scoring engine.

localStorage keys: `scoring_type`, `scoring_tep`, `scoring_two_qb`, `scoring_six_pt_pass`

## Default Projections (`packages/core/utils/defaults.ts`)

- `getDefaultProjection(seasons, minSeason?)` — maps most recent season's raw stats into a `PlayerProjection`; returns all zeros if no seasons or latest season is older than `minSeason`
- `getDefaultFantasyPoints(seasons, minSeason?)` — returns `fantasy_points` from most recent season; returns 0 if stale

## Design System

### Theme

Dark theme throughout. All colors are CSS custom properties defined in `apps/web/app/globals.css` inside `@theme {}` (Tailwind v4). Use `var(--token-name)` in inline styles; use `text-[var(--color-x)]` in Tailwind classes (but prefer inline styles for token-based colors to avoid Tailwind arbitrary value parsing issues with `rgba()`).

### Color Tokens

```
Brand
  --color-brand:         #C8F060   (lime green — primary accent)
  --color-brand-hover:   #B4DC48
  --color-brand-subtle:  rgba(200,240,96,0.12)
  --color-brand-border:  rgba(200,240,96,0.25)

Backgrounds (darkest → lightest)
  --color-bg-tertiary:   #12120F   (page background)
  --color-bg-primary:    #1C1C18   (cards)
  --color-bg-secondary:  #242420   (elevated surfaces, card headers/footers)

Text
  --color-text-primary:  #F0EFE8
  --color-text-secondary:#B4B3AC
  --color-text-tertiary: #9A9992

Borders (rgba white)
  --color-border-light:  rgba(255,255,255,0.06)
  --color-border-medium: rgba(255,255,255,0.12)
  --color-border-strong: rgba(255,255,255,0.20)

Position badges
  --color-pos-rb-*: lime green
  --color-pos-wr-*: blue
  --color-pos-qb-*: red-orange
  --color-pos-te-*: purple

Semantic
  --color-delta-up/down: brand green / red-orange
  --color-baseline-*: brand green tints (projection form baseline badge)
  --color-input-modified-*: brand green tints (modified stat inputs)
```

### Shared Component Classes (`@layer components`)

Defined in `globals.css`:

| Class | Purpose |
|---|---|
| `.card` | `bg-primary` surface, `border-light` border, `radius-lg`, `overflow-hidden` |
| `.btn-brand` | Lime-green filled button, `#1A1A18` text (dark for contrast on green) |
| `.btn-ghost` | Transparent button with medium border |
| `.badge-pos` / `.badge-pos-{POS}` | Position chip (use `<PositionBadge />` component) |
| `.label-caps` | 10px uppercase tracking label in `text-tertiary` |
| `.divider-h` / `.divider-v` | Hairline separators |
| `.pts-value` | Brand-colored tabular-nums pts display |
| `.news-dot` | 6px lime dot for news indicator |
| `.delta-up` / `.delta-down` | Green/red delta text |

### Hover States

Use `onMouseEnter`/`onMouseLeave` with `rgba(255,255,255,0.03)` for row hovers — do not use Tailwind `hover:bg-[rgba(...)]` (comma in arbitrary values causes parse issues).

### Indicator Bars

For colored left-border accents next to text in flex containers, use an explicit `display:inline-block; width:2px; height:1em` element rather than `border-left` — `border-left` spans full flex cell height regardless of content.

## Project Status and External Services

See `STATUS.md` for:
- Which rollout phases are complete
- Live deployment URLs
- What environment variables are needed and where they're set
- External service account status (Vercel, AWS, OAuth providers)

Update `STATUS.md` whenever infrastructure or external configuration changes.

## Design Reference

See `DESIGN.MD` for full product design including data models, scoring rules, and feature phases.

See `ROLLOUT.MD` for the production infrastructure rollout plan (Vercel → Auth/DynamoDB → Data Pipeline → DNS).

## AI Data Consistency (Planned Feature)

The reconciliation concept from DESIGN.MD has been expanded. Rather than simple stat cross-checking (e.g. QB pass TDs vs WR/TE rec TDs), the planned feature is a broader **AI-powered data consistency checker** that:
- Identifies all types of issues with user projection entries across the roster
- Flags statistical outliers, impossible values, and cross-player inconsistencies
- Surfaces issues with AI-generated explanations rather than just flagging raw mismatches

This feature is deprioritized — not in any active rollout phase — but should inform architectural decisions (e.g. having all projections accessible server-side when auth lands).
