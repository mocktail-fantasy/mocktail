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
| Styling | Tailwind CSS v4 |
| Monorepo | Turborepo |
| Mobile (future) | React Native + Expo |
| Auth (production) | NextAuth.js (OAuth: Google, Discord, GitHub) |
| Hosting (production) | Vercel |
| Backend Services (production) | AWS (CDK for IaC) |

---

## Data Model

### Source Files (MVP)

Static JSON files served from `/public` in `apps/web`. All files are read server-side via `fs.readFileSync` in `apps/web/lib/data.ts` — not client-side fetch. This pattern is designed to swap to S3/CloudFront fetches in production without changing consumer code.

**`/public/active_rosters.json`** — Flat array of active NFL players. Only QB/RB/WR/TE positions are used by the app.
```json
[
  {
    "player_id": "00-0038389",
    "player_name": "Israel Abanikanda",
    "team": "DAL",
    "positions": ["RB"],
    "age": 23.4,
    "headshot": "https://static.www.nfl.com/image/upload/..."
  }
]
```

**`/public/historical_data.json`** — Seasonal stats keyed by `player_id`. Fumbles are aggregated into a single `fumbles_lost` per season (sum of sack, rushing, and receiving fumbles lost). Includes pre-computed `fantasy_points` (standard) and `fantasy_points_ppr` (PPR) per season.
```json
{
  "00-0039851": {
    "player_id": "00-0039851",
    "player_name": "Drake Maye",
    "positions": ["QB"],
    "team": "NE",
    "aggregate": { ... },
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
        "rushing": { "tds": 4, "yards": 450, "attempts": 103 },
        "receiving": { "tds": 0, "yards": 2, "targets": 1, "receptions": 1 }
      }
    ]
  }
}
```

**`/public/team_history.json`** — Previous-season per-team player stats keyed by team abbreviation. Used by the Teams page. Historical points for `TeamHistoryPlayer` entries are recalculated live via `calculateFantasyPoints` using raw stat fields (the pre-computed fields from `historical_data.json` are not available here).
```json
{
  "BUF": [
    {
      "player_id": "00-0034857",
      "player_name": "Josh Allen",
      "positions": ["QB"],
      "age": 29,
      "headshot": "...",
      "games_played": 16,
      "fantasy_points": 380.0,
      "passing_yards": 4500,
      "passing_tds": 40,
      "interceptions": 6,
      "rushing_yards": 520,
      "rushing_tds": 12,
      "receptions": 0,
      "receiving_yards": 0,
      "receiving_tds": 0,
      "fumbles_lost": 2
    }
  ]
}
```

**`/public/teams.json`** — Team metadata keyed by team abbreviation. Includes colors, logo URLs, and conference/division info.

**`/public/player_summaries.json`** — AI-generated news summaries for NFL skill-position players, keyed by `player_id`. Generated on a schedule by an external agent and dropped into this directory. Not every player has an entry.
```json
{
  "00-0034857": {
    "player_name": "Josh Allen",
    "team": "BUF",
    "summary": "Allen is dealing with a minor elbow concern heading into OTAs...",
    "sources": ["https://reddit.com/r/DynastyFF/..."],
    "article_count": 2,
    "generated_at": "2026-03-10T17:14:56"
  }
}
```

### TypeScript Interfaces (`packages/core/src/types/index.ts`)

```typescript
type Position = 'QB' | 'RB' | 'WR' | 'TE';

interface Player {
  player_id: string;
  player_name: string;
  team: string;
  positions: string[];  // array; filtered to fantasy positions via getFantasyPositions()
  age: number;
  headshot: string;
}

interface PassingStats {
  tds: number;
  yards: number;
  attempts: number;
  completions: number;
  interceptions: number;
}

interface RushingStats {
  tds: number;
  yards: number;
  attempts: number;
}

interface ReceivingStats {
  tds: number;
  yards: number;
  targets: number;
  receptions: number;
}

interface SeasonStats {
  season: number;
  games_played: number;
  fantasy_points: number;       // standard scoring, pre-computed
  fantasy_points_ppr: number;   // PPR scoring, pre-computed
  fumbles_lost: number;
  passing?: PassingStats;
  rushing?: RushingStats;
  receiving?: ReceivingStats;
}

interface PlayerAggregate {
  games_played: number;
  fantasy_points: number;
  fantasy_points_ppr: number;
  fumbles: number;
  fumbles_lost: number;
  passing: { average_completion_percentage: number; yards: number; tds: number; interceptions: number; };
  rushing: { attempts: number; yards: number; tds: number; };
  receiving: { receptions: number; targets: number; yards: number; tds: number; };
}

interface PlayerHistory {
  player_id: string;
  player_name: string;
  team: string;
  positions: string[];
  aggregate: PlayerAggregate;
  seasons: SeasonStats[];
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

interface TeamHistoryPlayer {
  player_id: string;
  player_name: string;
  positions: string[];
  age: number | null;
  headshot: string | null;
  games_played: number;
  fantasy_points: number;
  passing_attempts: number;
  passing_yards: number;
  passing_tds: number;
  interceptions: number;
  rushing_yards: number;
  rushing_tds: number;
  receptions: number;
  receiving_yards: number;
  receiving_tds: number;
  fumbles_lost: number;
}

interface PlayerSummary {
  player_name: string;
  team: string;
  summary: string;
  sources: string[];
  article_count: number;
  generated_at: string;  // ISO 8601
}
```

---

## Scoring Engine (`packages/core/scoring`)

The scoring engine supports all major fantasy formats. The scoring type is globally configurable via `ScoringContext` and persisted to `localStorage`.

### Scoring Settings

```typescript
interface ScoringSettings {
  scoringType: 'standard' | 'half_ppr' | 'ppr';
  tep: boolean;             // Tight End Premium: +0.5 pts/reception for TEs
  sixPointPassTDs: boolean; // Passing TDs worth 6pts instead of 4pts
}

const DEFAULT_SCORING: ScoringSettings = {
  scoringType: 'standard',
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

### Historical Half-PPR Calculation

`SeasonStats` stores both `fantasy_points` (standard) and `fantasy_points_ppr` (PPR) pre-computed. Half-PPR historical points: `(fantasy_points + fantasy_points_ppr) / 2` — exact because the only difference is 0.5 pts × receptions.

`TeamHistoryPlayer` only has `fantasy_points`; team view historical points are recalculated live via `calculateFantasyPoints` using raw stat fields.

---

## VORP Rankings (`packages/core/scoring/vorp.ts`)

Players can be ranked by **Value Over Replacement Player (VORP)** in addition to raw projected points.

**Replacement ranks (starters per 12-team league):**

| Position | Replacement Rank | 2QB Rank |
|---|---|---|
| QB | 12 | 32 |
| RB | 40 | 40 |
| WR | 50 | 50 |
| TE | 12 | 12 |

`calculateVORPBaselines(players, projectedPoints, twoQB?)` — for each position, sorts players by projected points and takes the score at the replacement index as the baseline.

`calculateVORP(playerPoints, position, baselines)` — player score minus position baseline. Negative VORP means the player is below replacement level.

**2QB mode:** When enabled, the QB replacement index rises to 32 (two QBs per team × 16 teams). Affects VORP baselines only — not raw point totals.

---

## Global Scoring State (`apps/web/app/_components/ScoringContext.tsx`)

`ScoringProvider` wraps the root layout. All pages access settings via the `useScoringType()` hook.

Exposes: `scoringType`, `setScoringType`, `tep`, `setTep`, `twoQB`, `setTwoQB`, `sixPtPass`, `setSixPtPass`, `scoringSettings`

`scoringSettings` is a derived `ScoringSettings` object passed directly to the scoring engine.

**`localStorage` keys:**

| Key | Values | Controls |
|---|---|---|
| `scoring_type` | `standard` \| `half_ppr` \| `ppr` | PPR format |
| `scoring_tep` | `true` \| `false` | Tight End Premium |
| `scoring_two_qb` | `true` \| `false` | 2QB VORP mode |
| `scoring_six_pt_pass` | `true` \| `false` | 6-point passing TDs |

---

## Application Phases

### Phase 1: MVP ✓

**Goal:** Validate UI/UX locally. No backend, no auth, no deployment.

**Persistence:** `localStorage`. User projections are keyed by `player_id` (`projection_{player_id}`) and stored as a `PlayerProjection` JSON blob.

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
- No projected points or rankings — evolved into the full Rankings page in Dev v0

**Player Page (`/players/[id]`):**
- Header: headshot, name, team, position, age
- Historical stats table: one row per season, columns vary by position
  - All positions: Season, G, Fum Lost
  - QB: Pass Yds, Pass TDs, INT, Rush Yds, Rush TDs
  - RB/WR/TE: Rec, Rec Yds, Rec TDs, Rush Yds, Rush TDs
- Projection input form below historical table
  - Fields match position-specific stats above (excluding attempts/completions/targets)
  - Live fantasy point total updates as user types
- Save button persists projection to `localStorage`

---

### Phase 2: Dev v0 ✓

**Goal:** Full feature set running locally. Validate all core flows before production migration.

**New Features:**

**Global Nav Header (`NavHeader`):**
- Persistent header across all main routes (Rankings, Teams, Free Agents)
- Scoring type selector: Standard / 0.5 PPR / PPR (dropdown)
- Toggle buttons: TEP, 2QB, 6pt Pass
- All settings persist to `localStorage` and update all rankings/points reactively

**VORP Rankings:**
- Players ranked by Value Over Replacement Player (VORP) in addition to raw projected points
- Default ranking mode is VORP (Smart); falls back to total points when a position filter is active
- Replacement ranks: QB=12, RB=40, WR=50, TE=12
- 2QB toggle: raises QB replacement rank to 32

**Scoring Type Selector (global, persisted in `localStorage`):**
- Toggle: Standard / 0.5PPR / PPR
- Toggle: TEP on/off
- Toggle: 2QB on/off
- Toggle: 6pt Pass TDs on/off
- All rankings and player point totals update reactively

**Player News:**
- Orange dot indicator in the name cell of player rows on the Rankings page for players with news
- NewsCard on the player detail page, rendered above the projection form
  - Shows summary text and relative timestamp ("Xh ago" / "Xd ago")
  - Collapsible sources list (hidden by default; "Show sources (N)" toggle)
  - Not rendered if no summary exists for the player
- Data sourced from `player_summaries.json`, loaded server-side

**New Routes:**

| Route | Description |
|---|---|
| `/` | Rankings — replaced the MVP player list; the primary landing page |
| `/teams` | Full team roster with inline stat entry |
| `/free-agents` | Free agent players with inline stat entry |

**Rankings Page (`/`):**
- All players sorted by VORP (default) or projected fantasy points (descending)
- Filterable by position; search by name or team
- Players without a user projection ranked by their most recent season's stats from `historical_data.json`
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
| S3 | Stores `active_rosters.json`, `historical_data.json`, `team_history.json`, `player_summaries.json` |
| CloudFront | CDN in front of S3 for fast global delivery of static data |
| DynamoDB | Stores per-user projection and ranking data |
| Lambda | Nightly job: fetches updated roster/historical data and writes to S3 |
| NextAuth.js | Handles OAuth flows (runs within Next.js on Vercel) |

**DynamoDB Data Model:**
- Partition key: `user_id`
- Sort key: `player_id`
- Attributes: `projection` (map), `fantasy_points` (number), `rank_override` (number, optional), `updated_at` (string)

**Data Flow (production):**
1. Static JSON files served via CloudFront → S3
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

**Aesthetic:** Professional and modern — Underdog Fantasy as the reference point. Clean typography, light neutral palette, no heavy gradients or cartoon elements.

**Color palette:** White/gray-50 backgrounds, gray-200 borders, orange-500 accent (points highlight, active toggles, save button). Position badge colors: QB=blue, RB=emerald, WR=violet, TE=orange.

**Player Cards (Rankings Page):** Each row displays rank, position badge, name (with orange dot if news exists), team, age, projected stats summary, and projected points. Clicking navigates to `/players/[id]`.

**Player Page Layout:**
```
[Headshot] [Name]  [Team] [Position] [Age]
          [Last Season Pts] [Passing] [Rushing/Receiving]
─────────────────────────────────────────
[News Card — summary, timestamp, collapsible sources]  ← if news exists

Position Tabs → Historical Stats Table
             → Projection Form
```

**Projection Form:**
- Fields pre-filled from most recent season stats (default values shown in muted grey)
- User-modified values shown in standard text
- Live fantasy point total updates as user types
- Save button persists to `localStorage`
