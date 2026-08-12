# Deployment Guide — Puzzle Module

M5 Phase 7 (Production Readiness) deliverable, extended for the Final Pre-Launch Tasks. CI (`.github/workflows/puzzle-module-ci.yml`) validates every push and PR — lint, unit tests, production build for the app; lint, build, unit tests, and real-emulator integration tests for `functions/` — but does **not** deploy anything. A separate workflow, `.github/workflows/puzzle-module-deploy.yml`, *can* deploy — but only when someone explicitly triggers it (`workflow_dispatch`, from the Actions tab); it never runs on push or PR. Until that's triggered, deployment is a manual CLI process following this guide.

## Merge Checklist (repository admin / approver)

Run through this before merging the release PR to `main`. This is distinct from the Release Checklist below — merging and deploying are two separate, independently-gated actions (see "Important" note under Deployment); merging does **not** trigger a deploy.

- [ ] No merge conflicts — `mergeable_state` is clean against the current `main`.
- [ ] CI is green on the head commit — check the **check runs** for both required jobs ("Lint, build & test (Ionic Angular app)" and "Lint, build, test & emulator-test (Cloud Functions)"), not just the legacy commit-status API, which can misreport `pending`/empty even when Actions results are in.
- [ ] Documentation is current: `README.md`, `DEPLOYMENT.md`, `RUNBOOK.md`, `RELEASE-NOTES-v1.0.0.md`, `CHANGELOG.md`, `M5-DELIVERABLES.md`, and `docs/puzzle-module/` (PRD, Module Contract, `PLATFORM-ARCHITECTURE.md`, ADRs) all reflect what's actually in the diff.
- [ ] PR title/description accurately describes the scope being merged — if the PR grew significantly since it was opened (e.g. started as one feature and accumulated the full release), update the description before merging so the merge commit's record matches its actual contents.
- [ ] `package.json` version bump and the `puzzle-module-v1.0.0` git tag are **intentionally not** part of this PR — both happen after merge, directly on the `main` merge commit (see Version Tagging below). Confirm nothing in the diff jumps the gun on this.
- [ ] Whoever merges has confirmed with the repository administrator who will perform the actual deploy that they're ready to pick it up — merging does not imply an immediate deploy, but the release notes/CHANGELOG assume one follows reasonably soon.
- [ ] Squash/merge strategy matches repository convention; commit message references the release if the convention calls for it.

## Prerequisites

- Firebase CLI (`firebase-tools`) installed and authenticated (`firebase login`) against an account with **Editor** or **Owner** on the `lovedigitally-puzzle` Firebase project — needed only for the manual-CLI path below; the GitHub Actions path authenticates with a service account instead.
- Node 20 (matches CI's `actions/setup-node@v4` pin).
- The real Firebase Web SDK `apiKey` for the `puzzle-module` Hosting site's registered Web App (Firebase Console → `lovedigitally-puzzle` → Project Settings → General → your apps → the Puzzle Module web app). This is **not a secret** by Firebase's own design (it's safe to ship client-side) — the rest of the web config (`authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`, `measurementId`) is already committed in `environment.prod.ts` as of the ADR-0011 migration; only `apiKey` still needs to come from a real source at deploy time.

## Environment Verification (do this first, every time)

`src/environments/environment.prod.ts` ships with one placeholder token (`__LOVEDIGITALLY_PUZZLE_WEB_API_KEY__`) deliberately — that real value was never available in the session that ran the ADR-0011 migration, and must never be hand-committed to this file.

**`npm run build:deploy`** (`scripts/apply-prod-env.mjs` + `ng build --configuration production`, then the placeholder file is restored via `git checkout`) is the one command that produces an actually-deployable build. It requires one environment variable — `FIREBASE_API_KEY` — and fails loudly, before building anything, if it's missing. **`npm run build:prod`** (what CI's validation job runs) deliberately does *not* do this substitution — it only needs to prove the app compiles, not that it's deployable, so it's fine for it to build against the placeholder.

1. **Deploying via GitHub Actions (recommended)**: add two repository secrets (Settings → Secrets and variables → Actions → New repository secret) — `FIREBASE_API_KEY` (the Web SDK apiKey from Prerequisites above), and `FIREBASE_SERVICE_ACCOUNT_KEY` (a GCP service account's JSON key, raw content, with Firebase Admin/Deploy permissions on `lovedigitally-puzzle` — create one at GCP Console → IAM & Admin → Service Accounts, grant it the `Firebase Admin` role, generate a JSON key). Once set, trigger `puzzle-module-deploy.yml` from the Actions tab — no local secret handling required, and nobody (including whoever triggers it) ever sees the raw values, since GitHub Actions redacts secret values from logs automatically.
2. **Deploying by hand**: export `FIREBASE_API_KEY` in your shell, run `npm run build:deploy`, then follow the manual `firebase deploy` commands below. Verify `git diff src/environments/environment.prod.ts` is empty afterward — `build:deploy` restores it automatically, but this is a real secret-leak risk worth double-checking, not a formality.
3. Either way, confirm `environment.prod.ts`'s `useEmulators: false` and `emulatorHosts: null` are unchanged — a production build must never attempt to connect to local emulators.

## One-Time Firebase Project Setup

The steps below only need to happen once per Firebase project, before the very first deploy. All of these are Console/CLI actions against the live `lovedigitally-puzzle` project — none of them are code changes, and none can be verified from this repository alone; a repository administrator with Owner/Editor access must perform and confirm them. `lovedigitally-puzzle` is a fresh dedicated project (ADR-0011) with its own Web App already registered — treat everything below as still needing verification, not assumed inherited from `lovedigitally-app`.

### 1. Creating the Firebase Hosting site (if missing)

`.firebaserc`'s `targets.lovedigitally-puzzle.hosting.puzzle-module: ["puzzle-module"]` only declares an **alias** used by this repo's `firebase deploy --only hosting:puzzle-module` commands — it does not create the underlying Hosting site in the live project. If the `puzzle-module` site doesn't exist yet in `lovedigitally-puzzle`, every Hosting deploy will fail until it's created:

1. Firebase Console → `lovedigitally-puzzle` → Hosting → **Add another site** → enter site ID `puzzle-module` (must match `.firebaserc` exactly). Or via CLI: `firebase hosting:sites:create puzzle-module --project lovedigitally-puzzle`.
2. Confirm the target mapping is applied locally: `firebase target:apply hosting puzzle-module puzzle-module --project lovedigitally-puzzle` (this writes/confirms the same mapping already checked into `.firebaserc` — safe to re-run).
3. Verify: `firebase hosting:sites:list --project lovedigitally-puzzle` should show `puzzle-module` in the list before attempting a deploy.

### 2. Enabling Google Authentication

The Creator flow's Google sign-in option requires the Google provider to be enabled for the `lovedigitally-puzzle` project — this is a fresh project, so nothing here should be assumed already configured:

1. Firebase Console → `lovedigitally-puzzle` → Build → Authentication → Sign-in method.
2. Enable **Email/Password** and **Google** as sign-in providers — Google needs a support email (required by its consent screen).
3. Under Authentication → Settings → **Authorized domains**, confirm the `puzzle-module` Hosting site's domain (its default `*.web.app`/`*.firebaseapp.com` domain, and any custom domain later attached) is present — Google sign-in fails silently from an unauthorized domain. Firebase adds the project's default domains automatically, but a custom domain must be added manually.
4. Enable **Anonymous** Authentication (used to scope the Recipient's silent session, see `CLAUDE.md`) — required from day one on this project, unlike the old shared project where it may have already been on for `lovedigitally-web`.

### 3. Configuring App Check (recommended)

**Not currently implemented in the app** — `app.config.ts` has no `initializeAppCheck`/reCAPTCHA integration, and every Cloud Functions request today logs `"verifications":{"app":"MISSING"}` (documented in `RUNBOOK.md` §4.5 as a known, accepted gap, not a regression). Enabling App Check is a genuine **code change**, not just a Console toggle, so it is out of scope for this release under the "do not modify application code unless absolutely necessary" constraint — recorded here as the recommended next step for whoever administers the project, not something this deploy depends on:

1. Firebase Console → `lovedigitally-puzzle` → Build → App Check → register the `puzzle-module` Hosting site's Web App with **reCAPTCHA Enterprise** (or v3) as the provider, obtain a site key.
2. Code work required before enforcement can be turned on (tracked as a Future Enhancement, not done in this release): add `firebase/app-check` initialization to `app.config.ts` alongside the existing `provideFunctions()`/`provideFirestore()` providers, and pass the App Check token through on every callable/Firestore/Storage request (the SDKs do this automatically once initialized).
3. Start in **Console → App Check → Enforce → Monitor mode** (metrics only, nothing blocked) for each product (Cloud Functions, Firestore, Storage) once the client-side change ships, to observe real traffic before flipping to **Enforced**.
4. Since `lovedigitally-puzzle` is now a dedicated project (ADR-0011), App Check enforcement here no longer affects `lovedigitally-web` — the cross-app coordination requirement from the shared-project era no longer applies.

## Release Checklist

Run through this in order. Every command below is run from `apps/puzzle-module/` unless stated otherwise.

- [ ] For a **first-ever** deploy of this app to `lovedigitally-puzzle`: One-Time Firebase Project Setup (above) completed — Hosting site exists, Authentication (Email/Password, Google, Anonymous) enabled. Not needed again on subsequent deploys.
- [ ] `git status` is clean; you're deploying an exact, reviewed commit (ideally one CI has already run against, not a local-only change).
- [ ] `npm ci && npm run lint && npm run build:prod` — clean, no errors, budgets not exceeded.
- [ ] `cd functions && npm ci && npm run lint && npm run build && npm test && npm run test:emulator` — clean, all specs passing (548 client / 171 functions unit / 46 emulator specs as of M5 Phase 6 — expect these counts to only grow).
- [ ] Environment Verification (above) completed for this specific build — real `apiKey`, not the placeholder.
- [ ] `firestore.indexes.json` reviewed for any new composite index a recent change might need (Firestore returns a direct console link in its error if a query needs one at runtime — better to catch it here).
- [ ] No secrets, API keys, or `.env*` files staged for commit (`firebase.json`'s functions `ignore` already excludes `.env*` from the Functions deploy bundle; this checklist item is a last line of defense, not a substitute for that).
- [ ] `firestore.rules`/`storage.rules` are this app's own standalone files (ADR-0011) — no cross-app coordination step needed anymore, unlike the shared-project era.
- [ ] Know your rollback path before you deploy, not after — re-read the Rollback Plan below; note the current Hosting release ID (`firebase hosting:releases:list --site puzzle-module`) so "the last good one" isn't a guess later.
- [ ] Deploy (see below).
- [ ] Smoke-test immediately after: open the live Hosting URL, sign in as a test Creator, confirm the Dashboard loads; open a real (or freshly-published test) `/e/:shareToken` link, confirm it resolves. For a first release, run the full UAT flow (`e2e/creator-to-recipient.spec.ts` — see `README.md`'s End-to-End UAT section) against the real deployed environment, not just the emulator.
- [ ] Version-tag the deployed commit (see Version Tagging below).

## Deployment

### Via GitHub Actions (recommended)

Actions tab → **Puzzle Module Deploy** → Run workflow → choose `all` / `hosting-only` / `functions-only` / `rules-only`. Requires the two repository secrets from Environment Verification above (`FIREBASE_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_KEY`) to already be set. The workflow builds with real config, builds Functions, authenticates via the service account, and deploys — in the safe order (Rules and Functions before Hosting) when `all` is chosen.

Optionally, add required reviewers to a GitHub **Environment** named `production` (Settings → Environments) — the workflow already targets `environment: production`, so if that environment has protection rules configured, a deploy pauses for approval before running, even though someone already had to manually trigger it. Not configured by default; this is an extra gate you can layer on, not something this PR turns on for you.

### Manually, via the Firebase CLI

Three independently deployable pieces, all from `apps/puzzle-module/` now — no more symlink target, no more deploying rules from `lovedigitally-web/`:

```bash
# From apps/puzzle-module/

# 1. Cloud Functions (the puzzle-module codebase)
cd functions && npm run build && cd ..
firebase deploy --only functions:puzzle-module --project lovedigitally-puzzle

# 2. Firestore + Storage Rules (standalone as of ADR-0011 — no longer
#    touches lovedigitally-web in any way)
firebase deploy --only firestore:rules,storage:rules --project lovedigitally-puzzle

# 3. Hosting (the built Angular app — build:deploy, not build:prod, see
#    Environment Verification above)
FIREBASE_API_KEY=... npm run build:deploy
firebase deploy --only hosting:puzzle-module --project lovedigitally-puzzle
```

All three, in the safe order (Rules and Functions before Hosting, so the newly-deployed client never talks to stale server-side contracts):

```bash
firebase deploy --only firestore:rules,storage:rules,functions:puzzle-module,hosting:puzzle-module --project lovedigitally-puzzle
```

`firebase.json`'s `emulators.singleProjectMode` and the `puzzle-module` Hosting/Functions targets (`.firebaserc`) are already configured correctly for this — no `--project` flag needed as long as your Firebase CLI's active project defaults to `lovedigitally-puzzle` (confirm with `firebase use`); the explicit flag above is shown for clarity.

### Verifying deployment success

After triggering either path above, confirm all of the following before considering the deploy done — a workflow run finishing "green" only proves the deploy commands exited 0, not that the app actually works:

1. **Workflow run** (GitHub Actions path): Actions tab → the triggered run → confirm all steps succeeded, not just that the run finished. Check the Functions deploy step's output for each function name deployed.
2. **Hosting**: open the live Hosting URL (Firebase Console → Hosting → `puzzle-module` → the listed domain) — confirm the app loads and isn't showing a stale cached build (hard-refresh / incognito if unsure).
3. **Cloud Functions**: Firebase Console → Functions → confirm all 7 callables plus the Storage trigger show a recent deploy timestamp and `asia-south1` as the region (see `CLAUDE.md` — deploying to the wrong region silently breaks every callable from the client's perspective).
4. **Rules**: Firebase Console → Firestore/Storage → Rules tab → confirm the "last deployed" timestamp matches this deploy, not a stale prior one.
5. **Smoke test**: run through the Release Checklist's smoke-test step (sign in as a test Creator, confirm the Dashboard loads, resolve a real `/e/:shareToken` link) against the live URL, not the emulator.
6. Only after all of the above: proceed to the full Production Verification Checklist (`PRODUCTION-VERIFICATION-CHECKLIST.md`) for a complete pass.

## Rollback Plan

Each of the three deployed pieces rolls back independently — you don't need to revert all three just because one had a problem.

- **Hosting**: Firebase Hosting keeps a release history automatically. Fastest rollback, no rebuild needed: Firebase Console → Hosting → `puzzle-module` site → Release history → find the last-known-good release → **Rollback**. Equivalent via CLI: `firebase hosting:clone lovedigitally-puzzle:puzzle-module:<good-release-id> lovedigitally-puzzle:puzzle-module` (get `<good-release-id>` from `firebase hosting:releases:list --site puzzle-module`). Takes effect immediately — no build, no deploy pipeline involved.
- **Cloud Functions**: no built-in "rollback" command — a bad Functions deploy is fixed by re-deploying the previous good commit. `git checkout <last-good-commit> -- apps/puzzle-module/functions && cd apps/puzzle-module/functions && npm run build && firebase deploy --only functions:puzzle-module --project lovedigitally-puzzle`, then revert the checkout. Cloud Functions v2 (Cloud Run under the hood) briefly runs both revisions during a deploy's traffic migration, so a bad deploy is never an instant hard cutover — but it's not instant to undo either; budget a few minutes.
- **Firestore/Storage Rules**: redeploy the previous rules text the same way as Functions — `git checkout <last-good-commit> -- apps/puzzle-module/firestore.rules apps/puzzle-module/storage.rules && firebase deploy --only firestore:rules,storage:rules --project lovedigitally-puzzle`. As of ADR-0011 this **only** affects `lovedigitally-puzzle` — no cross-app coordination with `lovedigitally-web` needed anymore, unlike the shared-project era.
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
