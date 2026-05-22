# Project Status

This file tracks deployment state, external services, and phase completion. Update it whenever infrastructure or external configuration changes. Referenced by CLAUDE.md so Claude Code has this context without asking.

---

## Deployment

| Service | Status | URL / Notes |
|---|---|---|
| Vercel (web app) | **Live** | Auto-deploys on push to `main` via GitHub integration |
| GitHub Actions CI | **Live** | Runs `type-check`, `lint`, and `cdk synth` on every push |
| AWS CDK infra | **Live** | `MocktailStack` deployed — single stack for all AWS resources |
| DynamoDB table | **Live** | `mocktail-projections` — on-demand billing, RETAIN policy |
| S3 bucket | **Live** | `mocktail-data-prod` — private, serves data files |
| CloudFront CDN | **Live** | Serves S3 data via OAC; 1-year TTL, invalidated by Lambda after each run |
| Lambda (ingestion) | **Live** | `MocktailStack-IngestionFunction` — nightly roster + rankings refresh |
| EventBridge rule | **Live** | Triggers Lambda nightly at 3am ET (8am UTC) |
| Custom domain | Not started | Phase 5 |

---

## Rollout Phase Completion

See `ROLLOUT.MD` for full phase specs.

| Phase | Description | Status |
|---|---|---|
| Phase 1 — Hosting | Vercel deploy + GitHub Actions CI | **Complete** |
| Phase 2a — Infrastructure | DynamoDB + CDK | **Complete** |
| Phase 2b — Auth | NextAuth.js + Google OAuth | **Complete** |
| Phase 2c — Persistence | DynamoDB wiring + session sync | **Complete** |
| Phase 3 — Data Pipeline | S3 + CloudFront + Lambda ingestion | **Complete** |
| Phase 4 — FantasyPros API | Rankings, projections, ADP, ECR integration | **Complete** |
| Phase 5 — DNS | Route 53 + custom domain on Vercel | Not started |

---

## Environment Variables

### Vercel (production)

| Variable | Status | Purpose |
|---|---|---|
| `NEXTAUTH_SECRET` | **Set** | NextAuth.js signing secret |
| `NEXTAUTH_URL` | **Set** | Full production URL |
| `GOOGLE_CLIENT_ID` | **Set** | Google OAuth credential |
| `GOOGLE_CLIENT_SECRET` | **Set** | Google OAuth credential |
| `DISCORD_CLIENT_ID` | **Set** | Discord OAuth credential |
| `DISCORD_CLIENT_SECRET` | **Set** | Discord OAuth credential |
| `DYNAMODB_TABLE_NAME` | **Set** | `mocktail-projections` |
| `AWS_REGION` | **Set** | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | **Set** | Least-privilege IAM user for DynamoDB access |
| `AWS_SECRET_ACCESS_KEY` | **Set** | Least-privilege IAM user for DynamoDB access |
| `DATA_BASE_URL` | **Set** | CloudFront distribution URL — switches data loading from `fs` to `fetch` |

### Local dev
No env vars required. `DATA_BASE_URL` unset → app reads from `apps/web/public/` via `fs.readFileSync`.

---

## External Accounts / Services

| Service | Account | Notes |
|---|---|---|
| Vercel | Connected via GitHub SSO | Repo auto-import |
| GitHub | — | Source of truth for CI/CD |
| AWS | **Live** | `MocktailStack` deployed, least-privilege IAM user created for Vercel |
| Google OAuth | **Live** | OAuth app created, credentials in Vercel |
| Discord OAuth | **Live** | OAuth app created, credentials in Vercel |
| FantasyPros | **Live** | API key set in Lambda env; rankings, projections, ADP fetched nightly |
| Route 53 / domain | Not set up | Phase 5 |

---

## Data Pipeline

Data is served from S3 via CloudFront and refreshed nightly by Lambda.

### Lambda ingestion (`infra/lambda/ingest.py`)

Runs nightly at 3am ET. Steps:
1. Download `players.csv` from NflVerse (player metadata, ESPN ID bridge)
2. Build FP → gsis_id mapping via ESPN ID bridge (FP players endpoint → espn_id → NflVerse gsis_id)
3. Fetch FantasyPros data via official API (`x-api-key` header):
   - ECR rankings (6 formats: std, half_ppr, ppr, sf_std, sf_half_ppr, sf_ppr)
   - ADP (half PPR only)
   - Stat projections (QB/RB/WR/TE, season-long)
4. Build `active_rosters.json` (~364 players):
   - Roster = all FP-ranked players that map to a gsis_id
   - Team from FP `player_team_id` (normalized JAC→JAX, LAR→LA)
   - Age, headshot, positions from NflVerse `players.csv`
   - Apply allow/deny config from `s3://mocktail-data-prod/config/config.json`
5. Upload `active_rosters.json` + `rankings.json` + `projections.json` to S3
6. Invalidate CloudFront (`/*`)

### Static/historical data (manual, once per offseason)

Updated locally via `scripts/generate_data.py`, uploaded via `scripts/upload_data.sh`:

| File | Source | Update frequency |
|---|---|---|
| `active_rosters.json` | FP-ranked players + NflVerse metadata | **Nightly (Lambda)** |
| `rankings.json` | FantasyPros ECR (6 formats) + ADP, keyed by gsis_id | **Nightly (Lambda)** |
| `projections.json` | FantasyPros stat projections (QB/RB/WR/TE), keyed by gsis_id | **Nightly (Lambda)** |
| `historical_data.json` | nflverse-data season stats | Once per offseason |
| `team_history.json` | nflverse-data season stats | Once per offseason |
| `team_summaries.json` | Derived from historical data | Once per offseason |
| `player_summaries.json` | AI-generated news summaries | Periodic manual run |
| `teams.json` | Team metadata (colors, logos) | Rarely changes |

### Allow/deny config

`s3://mocktail-data-prod/config/config.json` — controls which players are force-included or excluded from rosters without redeploying Lambda:

```json
{ "allow": ["gsis_id", ...], "deny": ["gsis_id", ...] }
```
