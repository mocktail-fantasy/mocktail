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
| Custom domain | Not started | Phase 4 |

---

## Rollout Phase Completion

See `ROLLOUT.MD` for full phase specs.

| Phase | Description | Status |
|---|---|---|
| Phase 1 — Hosting | Vercel deploy + GitHub Actions CI | **Complete** |
| Phase 2a — Infrastructure | DynamoDB + CDK | **Complete** |
| Phase 2b — Auth | NextAuth.js + OAuth | In progress |
| Phase 2c — Persistence | DynamoDB wiring + session sync | Not started |
| Phase 3 — Data Pipeline | S3 + CloudFront + Lambda ingestion (combined) | Not started |
| Phase 4 — DNS | Route 53 + custom domain on Vercel | Not started |

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
| `AWS_REGION` | **Set** | e.g. `us-east-1` |
| `AWS_ACCESS_KEY_ID` | **Set** | Least-privilege IAM user for DynamoDB access |
| `AWS_SECRET_ACCESS_KEY` | **Set** | Least-privilege IAM user for DynamoDB access |
| `DATA_BASE_URL` | Not set | Phase 3 — CloudFront distribution URL |

### Local dev
No env vars required. App runs entirely from `fs.readFileSync` on `apps/web/public/` JSON files.

---

## External Accounts / Services

| Service | Account | Notes |
|---|---|---|
| Vercel | Connected via GitHub SSO | Repo auto-import |
| GitHub | — | Source of truth for CI/CD |
| AWS | **Live** | `MocktailStack` deployed, least-privilege IAM user created for Vercel |
| Google OAuth | **Live** | OAuth app created, credentials in Vercel |
| Discord OAuth | **Live** | OAuth app created, credentials in Vercel |
| Route 53 / domain | Not set up | Phase 4 |

---

## Data Files

Static JSON files in `apps/web/public/` — committed to git, served by Vercel as static assets.

| File | Last updated | Notes |
|---|---|---|
| `active_rosters.json` | — | Updated manually via data scripts |
| `historical_data.json` | — | Updated manually via data scripts |
| `team_history.json` | — | Updated manually via data scripts |
| `team_summaries.json` | — | Updated manually via data scripts |
| `player_summaries.json` | — | Updated by AI news agent on a schedule |

Manual update process (until Phase 3 pipeline is live): files live in git, Vercel serves them. To update data: replace the JSON files and push to `main`.
