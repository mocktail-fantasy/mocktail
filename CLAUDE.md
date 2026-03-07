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
- `teams.json` — team metadata: colors, logos

All data is loaded **server-side** via `fs.readFileSync` in `apps/web/lib/data.ts` — not client-side fetch. This pattern is designed to swap to S3/CloudFront fetches in production without changing consumer code.

User projections are persisted to `localStorage` in the MVP (keyed by `player_id`).

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

Exposes: `scoringType`, `setScoringType`, `tep`, `setTep`, `twoQB`, `setTwoQB`, `scoringSettings`

`scoringSettings` is a derived `ScoringSettings` object passed directly to the scoring engine.

localStorage keys: `scoring_type`, `scoring_tep`, `scoring_two_qb`

## Default Projections (`packages/core/utils/defaults.ts`)

- `getDefaultProjection(seasons, minSeason?)` — maps most recent season's raw stats into a `PlayerProjection`; returns all zeros if no seasons or latest season is older than `minSeason`
- `getDefaultFantasyPoints(seasons, minSeason?)` — returns `fantasy_points` from most recent season; returns 0 if stale

## Design Reference

See `DESIGN.MD` for full product design including data models, scoring rules, all development phases, and production infrastructure plan.
