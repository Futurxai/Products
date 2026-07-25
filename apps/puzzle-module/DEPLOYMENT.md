# Deployment Guide — Puzzle Module

M5 Phase 7 (Production Readiness) deliverable, extended for the Final Pre-Launch Tasks. CI (`.github/workflows/puzzle-module-ci.yml`) validates every push and PR — lint, unit tests, production build for the app; lint, build, unit tests, and real-emulator integration tests for `functions/` — but does **not** deploy anything. A separate workflow, `.github/workflows/puzzle-module-deploy.yml`, *can* deploy — but only when someone explicitly triggers it (`workflow_dispatch`, from the Actions tab); it never runs on push or PR. Until that's triggered, deployment is a manual CLI process following this guide.

## Prerequisites

- Firebase CLI (`firebase-tools`) installed and authenticated (`firebase login`) against an account with **Editor** or **Owner** on the `lovedigitally-app` Firebase project — needed only for the manual-CLI path below; the GitHub Actions path authenticates with a service account instead.
- Node 20 (matches CI's `actions/setup-node@v4` pin).
- The real Firebase Web SDK config for the `puzzle-module` Hosting site's registered Web App (Firebase Console → `lovedigitally-app` → Project Settings → General → your apps → the Puzzle Module web app). This is **not a secret** by Firebase's own design (it's safe to ship client-side), but it must never be a placeholder in a build you actually deploy.

## Environment Verification (do this first, every time)

`src/environments/environment.prod.ts` ships with placeholder tokens (`__LOVEDIGITALLY_APP_WEB_API_KEY__`, `__LOVEDIGITALLY_APP_SENDER_ID__`, `__PUZZLE_MODULE_WEB_APP_ID__`) deliberately — the real values were never available in the sessions that built this app, and must never be hand-committed to this file.

**`npm run build:deploy`** (`scripts/apply-prod-env.mjs` + `ng build --configuration production`, then the placeholder file is restored via `git checkout`) is the one command that produces an actually-deployable build. It requires three environment variables — `FIREBASE_API_KEY`, `FIREBASE_SENDER_ID`, `FIREBASE_APP_ID` — and fails loudly, before building anything, if any are missing. **`npm run build:prod`** (what CI's validation job runs) deliberately does *not* do this substitution — it only needs to prove the app compiles, not that it's deployable, so it's fine for it to build against placeholders.

1. **Deploying via GitHub Actions (recommended)**: add four repository secrets (Settings → Secrets and variables → Actions → New repository secret) — `FIREBASE_API_KEY`, `FIREBASE_SENDER_ID`, `FIREBASE_APP_ID` (the Web SDK config from Prerequisites above), and `FIREBASE_SERVICE_ACCOUNT_KEY` (a GCP service account's JSON key, raw content, with Firebase Admin/Deploy permissions on `lovedigitally-app` — create one at GCP Console → IAM & Admin → Service Accounts, grant it the `Firebase Admin` role, generate a JSON key). Once set, trigger `puzzle-module-deploy.yml` from the Actions tab — no local secret handling required, and nobody (including whoever triggers it) ever sees the raw values, since GitHub Actions redacts secret values from logs automatically.
2. **Deploying by hand**: export the same three `FIREBASE_*` env vars in your shell, run `npm run build:deploy`, then follow the manual `firebase deploy` commands below. Verify `git diff src/environments/environment.prod.ts` is empty afterward — `build:deploy` restores it automatically, but this is a real secret-leak risk worth double-checking, not a formality.
3. Either way, confirm `environment.prod.ts`'s `useEmulators: false` and `emulatorHosts: null` are unchanged — a production build must never attempt to connect to local emulators.

## Release Checklist

Run through this in order. Every command below is run from `apps/puzzle-module/` unless stated otherwise.

- [ ] `git status` is clean; you're deploying an exact, reviewed commit (ideally one CI has already run against, not a local-only change).
- [ ] `npm ci && npm run lint && npm run build:prod` — clean, no errors, budgets not exceeded.
- [ ] `cd functions && npm ci && npm run lint && npm run build && npm test && npm run test:emulator` — clean, all specs passing (548 client / 171 functions unit / 46 emulator specs as of M5 Phase 6 — expect these counts to only grow).
- [ ] Environment Verification (above) completed for this specific build — real config, not placeholders.
- [ ] `firestore.indexes.json` reviewed for any new composite index a recent change might need (Firestore returns a direct console link in its error if a query needs one at runtime — better to catch it here).
- [ ] No secrets, API keys, or `.env*` files staged for commit (`firebase.json`'s functions `ignore` already excludes `.env*` from the Functions deploy bundle; this checklist item is a last line of defense, not a substitute for that).
- [ ] If this deploy touches `firestore.rules`/`storage.rules` (via the `lovedigitally-web/` symlink target), confirm `lovedigitally-web`'s own deploys aren't affected unexpectedly — this is the **one shared, single deployed ruleset** for both apps (see `README.md`'s "Rules files are shared, not duplicated" section).
- [ ] Know your rollback path before you deploy, not after — re-read the Rollback Plan below; note the current Hosting release ID (`firebase hosting:releases:list --site puzzle-module`) so "the last good one" isn't a guess later.
- [ ] Deploy (see below).
- [ ] Smoke-test immediately after: open the live Hosting URL, sign in as a test Creator, confirm the Dashboard loads; open a real (or freshly-published test) `/e/:shareToken` link, confirm it resolves. For a first release, run the full UAT flow (`e2e/creator-to-recipient.spec.ts` — see `README.md`'s End-to-End UAT section) against the real deployed environment, not just the emulator.
- [ ] Version-tag the deployed commit (see Version Tagging below).

## Deployment

### Via GitHub Actions (recommended)

Actions tab → **Puzzle Module Deploy** → Run workflow → choose `all` / `hosting-only` / `functions-only` / `rules-only`. Requires the four repository secrets from Environment Verification above to already be set. The workflow builds with real config, builds Functions, authenticates via the service account, and deploys — in the safe order (Rules and Functions before Hosting) when `all` is chosen.

Optionally, add required reviewers to a GitHub **Environment** named `production` (Settings → Environments) — the workflow already targets `environment: production`, so if that environment has protection rules configured, a deploy pauses for approval before running, even though someone already had to manually trigger it. Not configured by default; this is an extra gate you can layer on, not something this PR turns on for you.

### Manually, via the Firebase CLI

Three independently deployable pieces — deploy only what changed, or all three together for a full release:

```bash
# From apps/puzzle-module/

# 1. Cloud Functions (the puzzle-module codebase specifically — never
#    touches publishPage/createOrder/etc. from lovedigitally-web)
cd functions && npm run build && cd ..
firebase deploy --only functions:puzzle-module

# 2. Firestore + Storage Rules (shared with lovedigitally-web — see the
#    checklist item above before running this)
firebase deploy --only firestore:rules,storage:rules

# 3. Hosting (the built Angular app — build:deploy, not build:prod, see
#    Environment Verification above)
FIREBASE_API_KEY=... FIREBASE_SENDER_ID=... FIREBASE_APP_ID=... npm run build:deploy
firebase deploy --only hosting:puzzle-module
```

All three, in the safe order (Rules and Functions before Hosting, so the newly-deployed client never talks to stale server-side contracts):

```bash
firebase deploy --only firestore:rules,storage:rules,functions:puzzle-module,hosting:puzzle-module
```

`firebase.json`'s `emulators.singleProjectMode` and the `puzzle-module` Hosting/Functions targets (`.firebaserc`) are already configured correctly for this — no `--project` flag needed as long as your Firebase CLI's active project defaults to `lovedigitally-app` (confirm with `firebase use`).

## Rollback Plan

Each of the three deployed pieces rolls back independently — you don't need to revert all three just because one had a problem.

- **Hosting**: Firebase Hosting keeps a release history automatically. Fastest rollback, no rebuild needed: Firebase Console → Hosting → `puzzle-module` site → Release history → find the last-known-good release → **Rollback**. Equivalent via CLI: `firebase hosting:clone lovedigitally-app:puzzle-module:<good-release-id> lovedigitally-app:puzzle-module` (get `<good-release-id>` from `firebase hosting:releases:list --site puzzle-module`). Takes effect immediately — no build, no deploy pipeline involved.
- **Cloud Functions**: no built-in "rollback" command — a bad Functions deploy is fixed by re-deploying the previous good commit. `git checkout <last-good-commit> -- apps/puzzle-module/functions && cd apps/puzzle-module/functions && npm run build && firebase deploy --only functions:puzzle-module`, then revert the checkout. Cloud Functions v2 (Cloud Run under the hood) briefly runs both revisions during a deploy's traffic migration, so a bad deploy is never an instant hard cutover — but it's not instant to undo either; budget a few minutes.
- **Firestore/Storage Rules**: redeploy the previous rules text the same way as Functions — `git checkout <last-good-commit> -- lovedigitally-web/firestore.rules lovedigitally-web/storage.rules && firebase deploy --only firestore:rules,storage:rules`. **This is the highest-blast-radius rollback of the three** — these rules are shared with `lovedigitally-web`, so reverting them affects that app too; confirm with whoever owns `lovedigitally-web`'s deploys before rolling back Rules alone, not just Puzzle Module's own Hosting/Functions.
- **If the problem is data, not code** (a bad write got through before a fix deployed): there is no automatic point-in-time restore configured for Firestore in this setup (would require enabling Firestore's PITR feature or scheduled exports, neither set up here — see Known Limitations). Manual data correction via the Admin SDK or Firebase Console is the only current option; add PITR before a real launch if bad-write recovery matters for this product (see Future Enhancement Recommendations).
- **After any rollback**: re-run the Release Checklist's smoke test, and check Cloud Logging for the error that triggered the rollback in the first place — a rollback buys time, it doesn't fix the underlying cause.

## Monitoring

- **Cloud Functions**: every callable already emits structured JSON logs via `firebase-functions/logger` (`functions/src/config/logger.ts`) — this integrates automatically with **Cloud Logging** and **Cloud Monitoring** once deployed; no extra setup needed for the baseline (invocation counts, error rates, latency percentiles, memory/CPU) — that's provided by the Cloud Functions v2 (Cloud Run) runtime itself. Filter by `functionName`, `experienceId`, `actorUid`, or `domainErrorCode` (every log line carries these consistently — see `createLogger`'s doc comment).
- **Custom alerting policies** (e.g., "page me if the error rate exceeds X%") are **not configured** — this requires explicit setup in the Google Cloud Console (Monitoring → Alerting) against the deployed project, which is outside what a code change can establish. Recommended before a real launch, not done here.
- **Client-side error monitoring** (e.g., Sentry/Crashlytics) is **not integrated** — the app's own `ToastHostComponent`/inline error states are the only user-facing error surface; there's no aggregated visibility into client-side failures across real users. Recommended as a future enhancement (see `README.md`'s Future Enhancement Recommendations), not built here.

## Logging Review

Audited every `logger.info`/`warn`/`error`/`domainRejection` call site across `functions/src/application/*.ts` (M5 Phase 6): none ever logs a submitted answer's raw text, a correct answer, a raw share token, or any other Recipient/Creator-authored content — only IDs, counts, and enum-like metadata (`experienceId`, `questionId`, `attemptNumber`, `earnedVia`, `domainErrorCode`). Client-side: zero `console.*` calls in production code (`src/app/**/*.ts`, excluding specs). Nothing found to fix.

## Version Tagging

`package.json` (both `apps/puzzle-module/package.json` and `apps/puzzle-module/functions/package.json`) currently reads `0.1.0` — unchanged since scaffolding (M0). No git tags exist for this app yet. Confirmed with the user: tag **after** this PR merges to `main`, not on the still-open PR branch — tagging pre-merge code as a release would mark a commit that was never actually integrated. Once merged: bump both `package.json` files to `1.0.0` (the M0–M5 milestone work here constitutes the full-featured first release — Creator authoring, Recipient gameplay, analytics, and this hardening pass), then `git tag puzzle-module-v1.0.0 <merge-commit-sha> && git push origin puzzle-module-v1.0.0` (prefixed, not a bare `v1.0.0`, since this is one app in a monorepo with its own release cadence). See `RELEASE-NOTES-v1.0.0.md` for the prepared release notes — ready to publish alongside the tag.
