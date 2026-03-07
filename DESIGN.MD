# Mocktail – Design Document

## Overview

Mocktail is a fantasy football projection and mock draft tool. Users enter per-player stat projections, which are converted to fantasy points and used to generate custom player rankings. The app is designed to evolve from a local MVP into a fully deployed, multi-user web application with a future companion mobile app.

---

## Monorepo Structure

The project is a **Turborepo** monorepo structured to support code sharing between the web app and a future mobile app.

```
mocktail/
├── apps/
│   ├── web/          # Next.js 15 (App Router) — primary web application
│   └── mobile/       # Future: React Native + Expo
├── packages/
│   ├── core/         # Shared: TypeScript types, scoring engine, data utilities
│   └── ui/           # Future: shared component primitives (React Native Web)
└── turbo.json
```

All business logic — TypeScript interfaces, the scoring calculation engine, and data utilities — lives in `packages/core` and is consumed by both `apps/web` and `apps/mobile`. This prevents logic duplication and ensures scoring consistency across platforms.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web Framework | Next.js 15+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Monorepo | Turborepo |
| Mobile (future) | React Native + Expo |
| Auth (production) | NextAuth.js (OAuth: Google, Discord, GitHub) |
| Hosting (production) | Vercel |
| Backend Services (production) | AWS (CDK for IaC) |

---

## Data Model

### Source Files (MVP)

Static JSON files served from `/public` in `apps/web`.

**`/public/active_rosters.json`** — Flat array of active NFL players.
```json
[
  {
    "player_id": "00-0038389",
    "player_name": "Israel Abanikanda",
    "team": "DAL",
    "position": "RB",
    "age": 23.4,
    "headshot": "https://static.www.nfl.com/image/upload/..."
  }
]
```

**`/public/historical_data.json`** — Seasonal stats keyed by `player_id`. Fumbles are aggregated into a single `total_fumbles_lost` per season (sum of sack, rushing, and receiving fumbles lost).
```json
{
  "00-0039851": {
    "player_id": "00-0039851",
    "player_name": "Drake Maye",
    "position": "QB",
    "team": "NE",
    "seasons": [
      {
        "season": 2025,
        "games_played": 17,
        "fantasy_points": 350.96,
        "fantasy_points_ppr": 351.96,
        "fumbles_lost": 3,
        "passing": {
          "tds": 31,
          "yards": 4394,
          "attempts": 492,
          "completions": 354,
          "interceptions": 8
        },
        "rushing": {
          "tds": 4,
          "yards": 450,
          "attempts": 103
        },
        "receiving": {
          "tds": 0,
          "yards": 2,
          "targets": 1,
          "receptions": 1
        }
      }
    ]
  }
}
```

### TypeScript Interfaces (`packages/core/types`)

```typescript
type Position = 'QB' | 'RB' | 'WR' | 'TE';

interface Player {
  player_id: string;
  player_name: string;
  team: string;
  positions: string[];
  age: number;
  headshot: string;
}

interface SeasonStats {
  season: number;
  games_played: number;
  fantasy_points: number;
  fantasy_points_ppr: number;
  fumbles_lost: number;
  passing?: { tds: number; yards: number; attempts: number; completions: number; interceptions: number; };
  rushing?: { tds: number; yards: number; attempts: number; };
  receiving?: { tds: number; yards: number; targets: number; receptions: number; };
}

interface PlayerProjection {
  passing_yards: number;
  passing_tds: number;
  interceptions: number;
  receptions: number;
  receiving_yards: number;
  receiving_tds: number;
  rushing_yards: number;
  rushing_tds: number;
  fumbles_lost: number;
}

interface UserProjection {
  player_id: string;
  projection: PlayerProjection;
  fantasy_points: number;
}
```

---

## Scoring Engine (`packages/core/scoring`)

The scoring engine is built with full multi-format support from day one. The MVP UI exposes only Standard scoring, but the engine supports all formats so Dev v0 only requires adding UI toggles.

### Scoring Settings

```typescript
interface ScoringSettings {
  scoringType: 'standard' | 'half_ppr' | 'ppr';
  tep: boolean;          // Tight End Premium: +0.5 pts/reception for TEs
  sixPointPassTDs: boolean; // Passing TDs worth 6pts instead of 4pts
}

const DEFAULT_SCORING: ScoringSettings = {
  scoringType: 'half_ppr',  // Applied from Dev v0 onwards; MVP uses 'standard'
  tep: false,
  sixPointPassTDs: false,
};
```

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

---

## Application Phases

### Phase 1: MVP

**Goal:** Validate UI/UX locally. No backend, no auth, no deployment.

**Persistence:** `localStorage`. User projections are keyed by `player_id` and stored as a single JSON blob.

**Default Behavior:** If no user projection exists for a player, the stat input fields are pre-filled with that player's most recent season stats from `historical_data.json`. Pre-filled values render in muted grey; once a user modifies a field, it renders in normal text weight/color.

**Scoring:** Standard only (engine supports all modes internally).

**Routes:**

| Route | Description |
|---|---|
| `/` | Player list — all active players, filterable by position |
| `/players/[id]` | Player detail page |

**Player List (`/`):**
- Simple grid of player cards (headshot, name, team, position) as a navigation surface
- Position filter tabs: ALL / QB / RB / WR / TE
- Clicking a card navigates to `/players/[id]`
- No projected points or rankings — this page evolved into the full Rankings page in Dev v0

**Player Page (`/players/[id]`):**
- Header: headshot, name, team, position, age
- Historical stats table: one row per season, columns vary by position
  - All positions: Season, G, Fum Lost
  - QB: Pass Yds, Pass TDs, INT, Rush Yds, Rush TDs
  - RB/WR/TE: Rec, Rec Yds, Rec TDs, Rush Yds, Rush TDs
- Projection input form below historical table
  - Fields match position-specific stats above (excluding attempts/completions/targets — not relevant to fantasy scoring)
  - Live fantasy point total updates as user types
- Save button persists projection to `localStorage`

---

### Phase 2: Dev v0

**Goal:** Full feature set running locally. Validate all core flows before production migration.

**New Features:**

**VORP Rankings:**
- Players ranked by Value Over Replacement Player (VORP) in addition to raw projected points
- Replacement ranks: QB=12, RB=40, WR=50, TE=12
- 2QB toggle: raises QB replacement rank to 32

**Scoring Type Selector (global, persisted in `localStorage`):**
- Toggle: Standard / 0.5PPR / PPR
- Toggle: TEP on/off
- Toggle: 6pt Pass TDs on/off
- Default: 0.5PPR, TEP off, 6pt Pass TDs off
- All rankings and player point totals update reactively

**New Routes:**

| Route | Description |
|---|---|
| `/` | Rankings — replaced the MVP player list; now the default landing page |
| `/teams` | Full team roster with inline stat entry |
| `/free-agents` | Free agent players with inline stat entry |

**Rankings Page (`/`):**
- Replaced the MVP player list as the root route — rankings is the primary value proposition
- All players sorted by projected fantasy points (descending)
- Filterable by position
- Players without a user projection ranked by their most recent season's `fantasy_points` value from `historical_data.json`
- Points displayed reflect active scoring settings
- VORP displayed alongside raw projected points

**Team Page (`/teams`):**
- All NFL teams; select a team to view its full roster grouped by position
- Inline stat entry (same form as player page, without navigating away)
- Shows how changes to one player affect team-level totals
- Foundation for the reconciliation feature

**Free Agents Page (`/free-agents`):**
- Same inline stat entry UI as `/teams`, scoped to players without a team (FA)

**Reconciliation:**
- Triggered by a "Reconcile" button on the team page
- Detects stat inconsistencies within a team (e.g., QB passing TDs < sum of WR/TE receiving TDs)
- Phase 2 implementation: flags inconsistencies and displays them. Does not auto-correct.
- Phase 3+ consideration: offer to auto-adjust up or down

---

### Phase 3: Production p0

**Goal:** Public deployment with user accounts and persistent data.

**Hosting:** Vercel (Next.js web app).

**Auth:** NextAuth.js with OAuth providers: Google, Discord, GitHub.

**New Features:**
- User projections persist to DynamoDB (not `localStorage`)
- Manual ranking overrides: users can drag-and-drop to reorder rankings independently of calculated scores
- CSV export of rankings
- Nightly automated ingestion of updated roster and historical data

**AWS Infrastructure (managed via AWS CDK):**

| Service | Purpose |
|---|---|
| S3 | Stores `active_rosters.json` and `historical_data.json` |
| CloudFront | CDN in front of S3 for fast global delivery of static data |
| DynamoDB | Stores per-user projection and ranking data |
| Lambda | Nightly job: fetches updated roster/historical data and writes to S3 |
| NextAuth.js | Handles OAuth flows (runs within Next.js on Vercel) |

**DynamoDB Data Model:**
- Partition key: `user_id`
- Sort key: `player_id`
- Attributes: `projection` (map), `fantasy_points` (number), `rank_override` (number, optional), `updated_at` (string)

**Data Flow (production):**
1. `active_rosters.json` and `historical_data.json` served via CloudFront → S3
2. User projections read/written via Next.js API routes → DynamoDB
3. Nightly Lambda updates S3 files; CloudFront cache invalidated on update

---

### Phase 4: Future (Aspirational)

These features are out of scope for active development but inform architectural decisions made today.

- **AI Sanity Check:** Per-player stat analysis comparing user projection to historical range. Also a global rankings analysis vs. ADP, flagging major deviations with AI-generated summaries.
- **True Projections:** Replace "use last year's stats as default" with a model-generated projection per player, separate from the user's override.
- **Custom Scoring:** User-defined point values per stat category (likely a premium feature).
- **Export to Fantasy Apps:** Sync rankings to Sleeper, Yahoo, ESPN, Underdog (feasibility TBD per platform).
- **Payments:** Stripe integration if AI features require monetization.

---

## UI / UX Direction

**Aesthetic:** Professional and modern — Underdog Fantasy as the reference point. Clean typography, dark or neutral palette, no heavy gradients or cartoon elements.

**Player Cards (Roster Page):** Headshots sourced directly from NFL CDN URLs (already in roster data — no additional asset management needed). Cards display name, team, position, and projected points if a projection exists.

**Player Page Layout:**
```
[Headshot] [Name]  [Team] [Position] [Age]
─────────────────────────────────────────
Historical Stats
┌──────┬───┬──────────┬──────────┬─────┬──────────┬──────────┬──────────┐
│Season│ G │ Pass Yds │ Pass TDs │ INT │ Rush Yds │ Rush TDs │ Fum Lost │
└──────┴───┴──────────┴──────────┴─────┴──────────┴──────────┴──────────┘

2026 Projection
[Pass TDs ___] [Pass Yds ___] [Rush Yds ___] [Rush TDs ___]
[INT      ___] [Fum Lost ___]

Projected Points: 312.4 pts          [Save Projection]
```

Pre-filled default values (from most recent season) appear in muted grey. User-modified values appear in standard text.
