# Deployment Guide — Puzzle Module

M5 Phase 7 (Production Readiness) deliverable. CI (`.github/workflows/puzzle-module-ci.yml`) validates every push and PR — lint, unit tests, production build for the app; lint, build, unit tests, and real-emulator integration tests for `functions/` — but does **not** deploy anything. Deployment is a manual step, following this guide, until (if ever) a CD stage is explicitly added.

## Prerequisites

- Firebase CLI (`firebase-tools`) installed and authenticated (`firebase login`) against an account with **Editor** or **Owner** on the `lovedigitally-app` Firebase project.
- Node 20 (matches CI's `actions/setup-node@v4` pin).
- The real Firebase Web SDK config for the `puzzle-module` Hosting site's registered Web App (Firebase Console → `lovedigitally-app` → Project Settings → General → your apps → the Puzzle Module web app). This is **not a secret** by Firebase's own design (it's safe to ship client-side), but it must never be a placeholder in a build you actually deploy.

## Environment Verification (do this first, every time)

`src/environments/environment.prod.ts` ships with placeholder tokens (`__LOVEDIGITALLY_APP_WEB_API_KEY__`, `__LOVEDIGITALLY_APP_SENDER_ID__`, `__PUZZLE_MODULE_WEB_APP_ID__`) deliberately — the real values were never available in the sessions that built this app, and must never be hand-committed to this file. Before running a production build you intend to actually deploy:

1. Confirm you have the real values for all three placeholders (see Prerequisites above).
2. Replace them in a **local, uncommitted** copy of `environment.prod.ts`, or wire a build-time substitution step (e.g. `envsubst`, a small Node script reading from your CI secrets store) — whichever your deploy process uses. **There is currently no such step wired into `build:prod` or CI** — this is a known gap (see Known Limitations in `README.md`), not an oversight to silently work around.
3. Verify `git diff src/environments/environment.prod.ts` is empty before committing anything — a real secret value must never land in this file in version control.
4. Confirm `environment.prod.ts`'s `useEmulators: false` and `emulatorHosts: null` are unchanged — a production build must never attempt to connect to local emulators.

## Release Checklist

Run through this in order. Every command below is run from `apps/puzzle-module/` unless stated otherwise.

- [ ] `git status` is clean; you're deploying an exact, reviewed commit (ideally one CI has already run against, not a local-only change).
- [ ] `npm ci && npm run lint && npm run build:prod` — clean, no errors, budgets not exceeded.
- [ ] `cd functions && npm ci && npm run lint && npm run build && npm test && npm run test:emulator` — clean, all specs passing (548 client / 171 functions unit / 46 emulator specs as of M5 Phase 6 — expect these counts to only grow).
- [ ] Environment Verification (above) completed for this specific build — real config, not placeholders.
- [ ] `firestore.indexes.json` reviewed for any new composite index a recent change might need (Firestore returns a direct console link in its error if a query needs one at runtime — better to catch it here).
- [ ] No secrets, API keys, or `.env*` files staged for commit (`firebase.json`'s functions `ignore` already excludes `.env*` from the Functions deploy bundle; this checklist item is a last line of defense, not a substitute for that).
- [ ] If this deploy touches `firestore.rules`/`storage.rules` (via the `lovedigitally-web/` symlink target), confirm `lovedigitally-web`'s own deploys aren't affected unexpectedly — this is the **one shared, single deployed ruleset** for both apps (see `README.md`'s "Rules files are shared, not duplicated" section).
- [ ] Deploy (see below).
- [ ] Smoke-test immediately after: open the live Hosting URL, sign in as a test Creator, confirm the Dashboard loads; open a real (or freshly-published test) `/e/:shareToken` link, confirm it resolves.
- [ ] Version-tag the deployed commit (see Version Tagging below).

## Deployment

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

# 3. Hosting (the built Angular app)
npm run build:prod
firebase deploy --only hosting:puzzle-module
```

All three, in the safe order (Rules and Functions before Hosting, so the newly-deployed client never talks to stale server-side contracts):

```bash
firebase deploy --only firestore:rules,storage:rules,functions:puzzle-module,hosting:puzzle-module
```

`firebase.json`'s `emulators.singleProjectMode` and the `puzzle-module` Hosting/Functions targets (`.firebaserc`) are already configured correctly for this — no `--project` flag needed as long as your Firebase CLI's active project defaults to `lovedigitally-app` (confirm with `firebase use`).

## Monitoring

- **Cloud Functions**: every callable already emits structured JSON logs via `firebase-functions/logger` (`functions/src/config/logger.ts`) — this integrates automatically with **Cloud Logging** and **Cloud Monitoring** once deployed; no extra setup needed for the baseline (invocation counts, error rates, latency percentiles, memory/CPU) — that's provided by the Cloud Functions v2 (Cloud Run) runtime itself. Filter by `functionName`, `experienceId`, `actorUid`, or `domainErrorCode` (every log line carries these consistently — see `createLogger`'s doc comment).
- **Custom alerting policies** (e.g., "page me if the error rate exceeds X%") are **not configured** — this requires explicit setup in the Google Cloud Console (Monitoring → Alerting) against the deployed project, which is outside what a code change can establish. Recommended before a real launch, not done here.
- **Client-side error monitoring** (e.g., Sentry/Crashlytics) is **not integrated** — the app's own `ToastHostComponent`/inline error states are the only user-facing error surface; there's no aggregated visibility into client-side failures across real users. Recommended as a future enhancement (see `README.md`'s Future Enhancement Recommendations), not built here.

## Logging Review

Audited every `logger.info`/`warn`/`error`/`domainRejection` call site across `functions/src/application/*.ts` (M5 Phase 6): none ever logs a submitted answer's raw text, a correct answer, a raw share token, or any other Recipient/Creator-authored content — only IDs, counts, and enum-like metadata (`experienceId`, `questionId`, `attemptNumber`, `earnedVia`, `domainErrorCode`). Client-side: zero `console.*` calls in production code (`src/app/**/*.ts`, excluding specs). Nothing found to fix.

## Version Tagging

`package.json` (both `apps/puzzle-module/package.json` and `apps/puzzle-module/functions/package.json`) currently reads `0.1.0` — unchanged since scaffolding (M0). No git tags exist for this app yet. Recommended once this PR merges and a first real deploy happens: bump both `package.json` files to `1.0.0` (the M0–M5 milestone work here constitutes the full-featured first release — Creator authoring, Recipient gameplay, analytics, and this hardening pass), and tag the merge commit (`git tag puzzle-module-v1.0.0 && git push origin puzzle-module-v1.0.0` — prefixed, not a bare `v1.0.0`, since this is one app in a monorepo with its own release cadence). Not done as part of this PR — versioning a not-yet-deployed app preemptively would be premature, and the actual merge/deploy is the user's call.
