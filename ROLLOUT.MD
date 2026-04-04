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
- Auth and DynamoDB (Phase 2+): local dev uses localStorage only — no DynamoDB connection needed, same as today

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

---

### CI/CD and Infrastructure as Code

**Stack: GitHub Actions + AWS CDK + Vercel GitHub integration.**

- **GitHub Actions** — runs type-check + lint on every push (already live)
- **AWS CDK (TypeScript)** — `infra/` directory at repo root, grows incrementally per phase
- **Vercel GitHub integration** — auto-deploys on push to `main` (already live)

**Deploy flow:** `git push main` → GitHub Actions runs checks → `cdk deploy` (Phase 2+) → Vercel redeploys automatically.

CDK directory structure (grows per phase):

```
infra/
├── bin/mocktail.ts
└── lib/
    ├── storage-stack.ts     # Phase 2: DynamoDB
    ├── auth-stack.ts        # Phase 2: Secrets Manager (NextAuth secrets + OAuth creds)
    ├── data-stack.ts        # Phase 3: S3 + CloudFront
    └── ingestion-stack.ts   # Phase 3: Lambda + EventBridge + IAM
```

---

## Phase 1 — Hosting ✓ COMPLETE

**Goal:** Live app at a public URL. No backend. Data from static JSON files committed to git.

**Status:** Done. Vercel auto-deploys on push to `main`. GitHub Actions CI runs type-check + lint on every push. JSON data files are committed to git and served as Vercel static assets.

---

## Phase 2 — Auth + State Preservation

**Goal:** Users can sign in and have their projections persisted across sessions and devices.

### Auth

**Library:** NextAuth.js v5 (Auth.js) — Google + Discord OAuth providers.

No token-gated signup. Rankings and team pages remain fully public. Projection save requires login — show a modal prompt on Save click if the user is not authenticated.

### DynamoDB Table (`infra/lib/storage-stack.ts`)

Single table, on-demand billing:

| Attribute | Type | Notes |
|---|---|---|
| `user_id` (PK) | String | From NextAuth session |
| `player_id` (SK) | String | |
| `projection` | Map | Full `PlayerProjection` object |
| `fantasy_points` | Number | Pre-computed for display |
| `updated_at` | String | ISO timestamp |

### CDK Stacks

- `storage-stack.ts` — DynamoDB table, on-demand billing
- `auth-stack.ts` — Secrets Manager entries for NextAuth secret + OAuth client credentials

### Write Strategy

**Keep "Save Projection" as the only DynamoDB write trigger.**

**Hybrid session cache:** On sign-in, fetch all user projections from DynamoDB once → store in localStorage. During the session, read/write localStorage instantly (same as today). On "Save Projection" click, write through to DynamoDB. Fast UX, minimal writes, reliable data persistence.

### Session Load Flow

1. User signs in → Server Action fetches all projections via `getUserProjections()`
2. Results hydrate localStorage (existing client-side read pattern unchanged)
3. Reads: localStorage (instant). Writes: localStorage + DynamoDB on save button click

### First-Login Migration

If localStorage has projections and DynamoDB has none, prompt: "We found X saved projections in your browser. Import them to your account?" One-time, prevents data loss.

### Server Actions

- `saveProjection(playerId, projection)` — `PutItem` to DynamoDB, called on Save button click
- `getUserProjections()` — `Query` by `user_id`, called on sign-in

### Account UI

Avatar/initials in nav top-right → dropdown with profile photo, email, and sign out. No dedicated account page needed.

### GitHub Actions Update

Add `cdk deploy StorageStack AuthStack` step after checks pass on `main`.

**Local dev:** localStorage only — no DynamoDB connection, same as today.

**Outcome:** Users can create accounts via Google or Discord, projections persist across sessions and devices.

---

## Phase 3 — Data Pipeline (S3 + CloudFront + Automated Ingestion)

**Goal:** Data served from a global CDN and updated automatically. Manual data pushes are eliminated entirely.

**Rationale for combining:** There is no value in building a manual S3 upload workflow when automated ingestion immediately supersedes it. S3 + CloudFront + Lambda ship together as a single CDK deployment.

### CDK Stacks

**`data-stack.ts`**
- Private S3 bucket (`mocktail-data-prod`) — no public access
- CloudFront distribution with Origin Access Control (OAC) — S3 never accessed directly
- CloudFront URL set as `DATA_BASE_URL` in Vercel environment variables

**`ingestion-stack.ts`**
- Lambda function (Python 3.12, 15-min timeout) wrapping existing `scripts/generate_data.py` logic
- Lambda Layer for pandas (keeps deployment package small)
- EventBridge rule: nightly at 3am ET
- IAM role: `s3:PutObject` on `mocktail-data-prod` only (least privilege)
- CloudFront cache invalidation triggered after each successful run

### Code Change (`apps/web/lib/data.ts`)

Functions become `async`:

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

### Plug-and-Play Data Source

Abstract NflVerse fetching behind a `DataSource` protocol class. Swapping to a premium API = new class + env var update, no Lambda restructuring.

### GitHub Actions Update

Add `cdk deploy DataStack IngestionStack` to CI pipeline.

**Local dev:** Unchanged — `DATA_BASE_URL` is unset, `fs.readFileSync` runs as always.

**Outcome:** Data on global CDN, updated nightly automatically. No manual uploads ever required.

---

## Phase 4 — DNS

**Strategy: Route 53 + Vercel.**

1. Register domain in Route 53 console (one-time, ~$12/year)
2. CDK creates hosted zone + A record pointing to Vercel's anycast IP (`76.76.21.21`)
3. Add custom domain in Vercel dashboard: **Settings → Domains → Add**
4. Vercel provisions SSL via Let's Encrypt automatically

No application code changes required.

**Outcome:** App accessible at custom domain with HTTPS.
