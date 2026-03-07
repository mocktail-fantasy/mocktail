# Production Rollout Strategy

Phased rollout from dev v0 to production. Each phase is independently deployable and leaves the app in a fully functional state.

---

## Pre-Production Decisions

### Dev Environment

**Strategy: env-var-based data source switching in `lib/data.ts`.**

| `DATA_BASE_URL` env var | Behavior |
|---|---|
| Unset (local dev) | `fs.readFileSync` from `apps/web/public/` — current behavior, unchanged |
| Set (production) | `async fetch()` from CloudFront URL |

- No AWS credentials needed for local development at any phase
- `lib/data.ts` functions become `async` — Next.js Server Components support this natively
- For local data generation: `pnpm data:generate && pnpm data:sync` (unchanged)
- Auth and DynamoDB (Phase 3+): local dev uses localStorage only — no DynamoDB connection needed, same as today

This keeps local dev as simple as possible while giving production a clean upgrade path at each phase.

---

### Service Architecture

Everything lives in the Next.js app except data ingestion. No separate microservices.

| Concern | Implementation |
|---|---|
| Auth | NextAuth.js v5 — Next.js API routes, built-in session management |
| Projection reads/writes | Next.js Server Actions → DynamoDB |
| NFL data access | `lib/data.ts` — env-var switches local files ↔ CloudFront |
| Data ingestion | Standalone Lambda + EventBridge — the only truly separate service |

Microservices add operational complexity with zero benefit at this scale. Server Actions are the modern Next.js 15 pattern for mutations: type-safe, no separate API routes needed, no additional hosting cost.

**No separate "user service" or "NFL data service" is needed.** Server Actions handle projection reads/writes. `lib/data.ts` handles NFL data. These are internal app concerns, not services.

---

### CI/CD and Infrastructure as Code

**Stack: GitHub Actions + AWS CDK + Vercel GitHub integration.**

- **GitHub Actions** — free, integrates natively with everything, set up from Phase 1
- **AWS CDK (TypeScript)** — `infra/` directory at repo root, grows incrementally per phase
- **Vercel GitHub integration** — auto-deploys on push to `main`, no CLI or CDK construct needed

**Deploy flow:** `git push main` → GitHub Actions runs checks → `cdk deploy` (Phase 2+) → Vercel redeploys automatically.

Vercel is **not** managed by CDK. There is no mature Vercel CDK construct and the GitHub integration is the standard, recommended deployment mechanism. CDK manages AWS resources; Vercel manages hosting. Both are triggered by a single `git push`.

CDK directory structure (grows per phase):

```
infra/
├── bin/mocktail.ts
└── lib/
    ├── data-stack.ts        # Phase 2: S3 + CloudFront
    ├── storage-stack.ts     # Phase 3: DynamoDB
    ├── auth-stack.ts        # Phase 3: Secrets Manager (NextAuth secrets + OAuth creds)
    └── ingestion-stack.ts   # Phase 4: Lambda + EventBridge + IAM
```

`cdk diff` before every deploy shows exactly what changes. Full traceability from day one.

**Note:** Integration tests are not part of the initial pipeline. CI runs type-check and lint only.

---

## Phase 1 — Hosting

**Goal:** Live app at a public URL. No backend. Data from static JSON files committed to git.

**Pre-flight check:** Confirm `apps/web/public/*.json` are committed (not gitignored). The git status shows old root-level `public/` files as deleted — verify the real files at `apps/web/public/` are tracked. Without this, Vercel has no data to serve.

### Vercel Setup (step-by-step)

1. Create account at [vercel.com](https://vercel.com) via GitHub SSO
2. Click **"Add New Project"** → import the GitHub repo
3. Set **Root Directory** to `apps/web` — this is critical; Vercel must not build from the repo root
4. Vercel auto-detects Next.js — no build command changes needed
5. Click **Deploy** → get a free `*.vercel.app` URL
6. Vercel GitHub integration is enabled automatically — every push to `main` triggers a redeploy

### GitHub Actions (set up now)

```yaml
# .github/workflows/ci.yml
on: push
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 8
      - run: pnpm install
      - run: pnpm type-check
      - run: pnpm lint
```

CI runs on every push. The `cdk deploy` step is added in Phase 2 when there are AWS resources to deploy.

**Local dev (Phase 1):** Unchanged — `pnpm dev`, data from `apps/web/public/`.

**Outcome:** Live app, no AWS dependencies, full CI on every commit.

---

## Phase 2 — Static Data (S3 + CloudFront)

**Goal:** Data served from a global CDN instead of Vercel's static file serving.

**Do not split into 2a/2b.** S3 + CloudFront is a single 30-minute CDK deployment. Doing S3-only first creates a throwaway access pattern with no UX benefit.

### CDK Stack (`infra/lib/data-stack.ts`)

- Private S3 bucket (`mocktail-data-prod`) — no public access
- CloudFront distribution with Origin Access Control (OAC) — S3 is never accessed directly, only via CloudFront
- CloudFront URL set as `DATA_BASE_URL` in Vercel environment variables

### Code Change (`apps/web/lib/data.ts`)

Functions become `async`. Logic:

```ts
async function loadJson(filename: string) {
  const base = process.env.DATA_BASE_URL;
  if (base) {
    const res = await fetch(`${base}/${filename}`, { next: { revalidate: 3600 } });
    return res.json();
  }
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', filename), 'utf-8'));
}
```

- Next.js cached `fetch` with 1-hour revalidation in production
- `fs.readFileSync` fallback for local dev — no env var needed, no AWS creds needed
- All consuming Server Components become `async` — standard Next.js pattern

### Manual Data Upload (until Phase 4)

```bash
aws s3 sync apps/web/public/ s3://mocktail-data-prod/
```

### GitHub Actions Update

Add `cdk deploy DataStack` step after checks pass on `main`.

**Local dev (Phase 2):** Unchanged — `DATA_BASE_URL` is not set locally, `fs.readFileSync` path runs.

**Outcome:** Data on CDN globally, 1-hour cache. Local dev still uses local files. No developer needs AWS credentials to run the app.

---

## Phase 3 — Auth + State Preservation

**Goal:** Users can sign in and have their projections persisted across sessions and devices.

### Auth

**Library:** NextAuth.js v5 (Auth.js) — Google + Discord OAuth providers.

No token-gated signup. Fantasy football is niche — bot-farm risk is negligible. DynamoDB at this scale is essentially free (on-demand billing, cents per month for a small user base). Vercel's free tier handles the traffic. Rate limiting via NextAuth.js middleware is sufficient protection. Token gates add friction and dev complexity for a problem that doesn't exist yet.

### DynamoDB Table (`infra/lib/storage-stack.ts`)

Single table, on-demand billing:

| Attribute | Type | Notes |
|---|---|---|
| `user_id` (PK) | String | From NextAuth session |
| `player_id` (SK) | String | |
| `projection` | Map | Full `PlayerProjection` object |
| `fantasy_points` | Number | Pre-computed for display |
| `updated_at` | String | ISO timestamp |

One table is sufficient for p0. Projections are the only user data being stored.

### CDK Stacks

- `storage-stack.ts` — DynamoDB table, on-demand billing
- `auth-stack.ts` — Secrets Manager entries for NextAuth secret + OAuth client credentials

### Write Strategy

**Keep "Save Projection" as the only DynamoDB write trigger.**

| Strategy | Assessment |
|---|---|
| Every keystroke | Excessive writes, no UX benefit |
| Save button click | Matches existing UX, intentional, low frequency ✓ |
| Session end | Unreliable — tab close, network drop, mobile backgrounding ✗ |

**Hybrid session cache:** On sign-in, fetch all user projections from DynamoDB once → store in localStorage. During the session, read/write localStorage instantly (same as today). On "Save Projection" click, write through to DynamoDB. Fast UX, minimal writes, reliable data persistence.

### Session Load Flow

1. User signs in → Server Action fetches all projections via `getUserProjections()`
2. Results hydrate localStorage (existing client-side read pattern unchanged)
3. Reads: localStorage (instant). Writes: localStorage + DynamoDB on save button click

### First-Login Migration

If localStorage has projections and DynamoDB has none, prompt: "We found X saved projections in your browser. Import them to your account?" One-time, prevents data loss, simple to implement.

### Server Actions

- `saveProjection(playerId, projection)` — `PutItem` to DynamoDB, called on Save button click
- `getUserProjections()` — `Query` by `user_id`, called on sign-in

### Auth Gating

Rankings and team pages remain fully public (read-only, no login required). Projection save requires login — show a modal prompt on Save click if the user is not authenticated.

### Account UI

Avatar/initials in nav top-right → dropdown with profile photo, email, and sign out. No dedicated account page needed. Users need a visual indication they're signed in; a dropdown covers this without unnecessary complexity.

**Local dev (Phase 3):** localStorage only — no DynamoDB connection, same as today. Auth is skipped locally; projections persist via localStorage as before.

**Outcome:** Users can create accounts via Google or Discord, projections persist across sessions and devices.

---

## Phase 4 — Data Ingestion

**Goal:** S3 updates automatically instead of manually.

### Lambda

Wraps the existing `scripts/generate_data.py` logic:

- Python 3.12 runtime, 15-minute timeout
- Lambda Layer for pandas (keeps deployment package small)
- Environment variables: `OUTPUT_BUCKET`, `NFLVERSE_YEAR`, `DATA_SOURCE`
- Writes final JSON files directly to `mocktail-data-prod` S3 bucket
- CloudFront serves stale content until TTL expires (or trigger a manual invalidation via CDK after each run)

### Plug-and-Play Data Source

Abstract NflVerse fetching behind a `DataSource` protocol class. Lambda instantiates the implementation based on the `DATA_SOURCE` env var. Swapping to a premium API = new class + env var update, no Lambda restructuring.

### CDK Stack (`infra/lib/ingestion-stack.ts`)

- Lambda function + Lambda Layer
- EventBridge rule: nightly at 3am ET
- IAM role: `s3:PutObject` on `mocktail-data-prod` only (least privilege)

### GitHub Actions Update

Add Lambda deployment to the CI pipeline — `cdk deploy IngestionStack`.

**Local dev (Phase 4):** `pnpm data:generate && pnpm data:sync` — unchanged, Lambda not involved locally.

**Outcome:** S3 data updated nightly. No manual uploads required after this phase.

---

## Phase 5 — DNS

**Strategy: Route 53 + Vercel.**

1. Register domain in Route 53 console (one-time, ~$12/year)
2. CDK creates hosted zone + A record pointing to Vercel's anycast IP (`76.76.21.21`)
3. Add custom domain in Vercel dashboard: **Settings → Domains → Add**
4. Vercel provisions SSL via Let's Encrypt automatically — no manual cert management

No application code changes required. Route 53 hosted zone lives in CDK (`infra/lib/`) for full traceability.

**Outcome:** App accessible at custom domain with HTTPS. All infrastructure documented in CDK.
