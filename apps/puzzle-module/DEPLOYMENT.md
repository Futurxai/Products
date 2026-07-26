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

- Firebase CLI (`firebase-tools`) installed and authenticated (`firebase login`) against an account with **Editor** or **Owner** on the `lovedigitally-app` Firebase project — needed only for the manual-CLI path below; the GitHub Actions path authenticates with a service account instead.
- Node 20 (matches CI's `actions/setup-node@v4` pin).
- The real Firebase Web SDK config for the `puzzle-module` Hosting site's registered Web App (Firebase Console → `lovedigitally-app` → Project Settings → General → your apps → the Puzzle Module web app). This is **not a secret** by Firebase's own design (it's safe to ship client-side), but it must never be a placeholder in a build you actually deploy.

## Environment Verification (do this first, every time)

`src/environments/environment.prod.ts` ships with placeholder tokens (`__LOVEDIGITALLY_APP_WEB_API_KEY__`, `__LOVEDIGITALLY_APP_SENDER_ID__`, `__PUZZLE_MODULE_WEB_APP_ID__`) deliberately — the real values were never available in the sessions that built this app, and must never be hand-committed to this file.

**`npm run build:deploy`** (`scripts/apply-prod-env.mjs` + `ng build --configuration production`, then the placeholder file is restored via `git checkout`) is the one command that produces an actually-deployable build. It requires three environment variables — `FIREBASE_API_KEY`, `FIREBASE_SENDER_ID`, `FIREBASE_APP_ID` — and fails loudly, before building anything, if any are missing. **`npm run build:prod`** (what CI's validation job runs) deliberately does *not* do this substitution — it only needs to prove the app compiles, not that it's deployable, so it's fine for it to build against placeholders.

1. **Deploying via GitHub Actions (recommended)**: add four repository secrets (Settings → Secrets and variables → Actions → New repository secret) — `FIREBASE_API_KEY`, `FIREBASE_SENDER_ID`, `FIREBASE_APP_ID` (the Web SDK config from Prerequisites above), and `FIREBASE_SERVICE_ACCOUNT_KEY` (a GCP service account's JSON key, raw content, with Firebase Admin/Deploy permissions on `lovedigitally-app` — create one at GCP Console → IAM & Admin → Service Accounts, grant it the `Firebase Admin` role, generate a JSON key). Once set, trigger `puzzle-module-deploy.yml` from the Actions tab — no local secret handling required, and nobody (including whoever triggers it) ever sees the raw values, since GitHub Actions redacts secret values from logs automatically.
2. **Deploying by hand**: export the same three `FIREBASE_*` env vars in your shell, run `npm run build:deploy`, then follow the manual `firebase deploy` commands below. Verify `git diff src/environments/environment.prod.ts` is empty afterward — `build:deploy` restores it automatically, but this is a real secret-leak risk worth double-checking, not a formality.
3. Either way, confirm `environment.prod.ts`'s `useEmulators: false` and `emulatorHosts: null` are unchanged — a production build must never attempt to connect to local emulators.

## One-Time Firebase Project Setup

The steps below only need to happen once per Firebase project, before the very first deploy. If they've already been done (e.g. by whoever set up `lovedigitally-web`), skip straight to the Release Checklist. All of these are Console/CLI actions against the live `lovedigitally-app` project — none of them are code changes, and none can be verified from this repository alone; a repository administrator with Owner/Editor access must perform and confirm them.

### 1. Creating the Firebase Hosting site (if missing)

`.firebaserc`'s `targets.lovedigitally-app.hosting.puzzle-module: ["puzzle-module"]` only declares an **alias** used by this repo's `firebase deploy --only hosting:puzzle-module` commands — it does not create the underlying Hosting site in the live project. If the `puzzle-module` site doesn't exist yet in `lovedigitally-app`, every Hosting deploy will fail until it's created:

1. Firebase Console → `lovedigitally-app` → Hosting → **Add another site** → enter site ID `puzzle-module` (must match `.firebaserc` exactly). Or via CLI: `firebase hosting:sites:create puzzle-module --project lovedigitally-app`.
2. Confirm the target mapping is applied locally: `firebase target:apply hosting puzzle-module puzzle-module --project lovedigitally-app` (this writes/confirms the same mapping already checked into `.firebaserc` — safe to re-run).
3. Verify: `firebase hosting:sites:list --project lovedigitally-app` should show `puzzle-module` in the list before attempting a deploy.
4. This site is independent of `lovedigitally-web`'s own Hosting site — creating it does not affect that app's Hosting in any way.

### 2. Enabling Google Authentication

The Creator flow's Google sign-in option requires the Google provider to be enabled for the `lovedigitally-app` project (email/password may already be enabled if `lovedigitally-web` uses it — Google needs its own explicit toggle):

1. Firebase Console → `lovedigitally-app` → Build → Authentication → Sign-in method.
2. If not already present, enable **Google** as a sign-in provider — select a support email (required by Google's consent screen) and save.
3. Under Authentication → Settings → **Authorized domains**, confirm the `puzzle-module` Hosting site's domain (its default `*.web.app`/`*.firebaseapp.com` domain, and any custom domain later attached) is present — Google sign-in fails silently from an unauthorized domain. Firebase adds the project's default domains automatically, but a custom domain must be added manually.
4. Anonymous Authentication (used to scope the Recipient's silent session, see `CLAUDE.md`) should already be enabled if `lovedigitally-web` uses it; if this is genuinely the first app on the project to need it, enable **Anonymous** in the same Sign-in method list.

### 3. Configuring App Check (recommended)

**Not currently implemented in the app** — `app.config.ts` has no `initializeAppCheck`/reCAPTCHA integration, and every Cloud Functions request today logs `"verifications":{"app":"MISSING"}` (documented in `RUNBOOK.md` §4.5 as a known, accepted gap, not a regression). Enabling App Check is a genuine **code change**, not just a Console toggle, so it is out of scope for this release under the "do not modify application code unless absolutely necessary" constraint — recorded here as the recommended next step for whoever administers the project, not something this deploy depends on:

1. Firebase Console → `lovedigitally-app` → Build → App Check → register the `puzzle-module` Hosting site's Web App with **reCAPTCHA Enterprise** (or v3) as the provider, obtain a site key.
2. Code work required before enforcement can be turned on (tracked as a Future Enhancement, not done in this release): add `firebase/app-check` initialization to `app.config.ts` alongside the existing `provideFunctions()`/`provideFirestore()` providers, and pass the App Check token through on every callable/Firestore/Storage request (the SDKs do this automatically once initialized).
3. Start in **Console → App Check → Enforce → Monitor mode** (metrics only, nothing blocked) for each product (Cloud Functions, Firestore, Storage) once the client-side change ships, to observe real traffic before flipping to **Enforced** — enforcing immediately, before any real client is sending tokens, would lock out every legitimate request including this app's own.
4. Do not enable enforcement against `lovedigitally-app` without coordinating with `lovedigitally-web`'s owner first — App Check enforcement is project-wide per product (Firestore/Storage/Functions), not scoped to one app's Hosting site.

## Release Checklist

Run through this in order. Every command below is run from `apps/puzzle-module/` unless stated otherwise.

- [ ] For a **first-ever** deploy of this app to `lovedigitally-app`: One-Time Firebase Project Setup (above) completed — Hosting site exists, Google Authentication enabled. Not needed again on subsequent deploys.
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
