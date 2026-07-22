# Puzzle Module

Ionic Angular (standalone components + Signals) PWA for the Love Digitally Puzzle Module. See `docs/puzzle-module/` at the repo root for the full PRD, Module Contract, Phase 4 UI/UX spec, and Phase 5/6 architecture and roadmap this app implements.

## Status

**Milestone M2 — Firebase Infrastructure & Cloud Functions complete.** M0 (scaffold/CI), M1 (domain layer), and M2 (all 6 Cloud Functions + image-slice trigger, Clean Architecture, Firestore transactions, Zod validation, structured logging, typed domain errors, unit + emulator tests) are done and fully validated. No UI yet — that's M3 (Creator) and M5 (Recipient), which consume the `functions/` API built here through `domain/ports/puzzle-api.port.ts`.

See `functions/src/` for the Cloud Functions codebase: `schemas/` (Zod), `callable/` (thin onCall wrappers), `application/` (use-cases), `infrastructure/` (Firestore/Storage/Auth adapters), `triggers/` (reveal-image slicing), `emulator-tests/` (real Firestore+Auth+Storage emulator coverage, run via `npm run test:emulator` inside `functions/`).

## Firebase project

This app shares the **`lovedigitally-app`** Firebase project with `/lovedigitally-web` — it does not have its own project. Isolation comes from:

- A `puzzle_*` Firestore/Storage namespace (`puzzle_creators`, `puzzle_experiences`, `puzzle_experiences_private`, `puzzle_progress`, `puzzle_events`, `puzzle_storage/...`) that never collides with `lovedigitally_pages` / `lovedigitally_orders` / `lovedigitally_subscriptions` / `lovedigitally_webhook_events`.
- A dedicated Hosting site target, `puzzle-module` (see `.firebaserc`), so this app deploys to its own URL without touching the existing static site's Hosting config.
- A dedicated Functions **codebase**, `puzzle-module` (see `firebase.json`), so `firebase deploy --only functions:puzzle-module` never touches `publishPage` / `createOrder` / `verifyOrder` / `createSubscription` / `verifySubscription` / `razorpayWebhook`.

### ⚠️ Rules files are shared, not duplicated

`firestore.rules` and `storage.rules` in this directory are **symlinks** to `../../lovedigitally-web/firestore.rules` and `../../lovedigitally-web/storage.rules` — not copies. The Firebase CLI refuses to reference a rules file outside the current project directory (verified directly against the emulator while building M2 — not an assumption), so a symlink is what lets both apps' `firebase.json` point at one physical, single-source-of-truth file without the CLI's path restriction getting in the way, and without a real risk of the two copies drifting apart (they're the same inode).

**As of M2**: the `puzzle_*` match blocks are merged into `lovedigitally-web/firestore.rules` and `lovedigitally-web/storage.rules`, and both are covered by real emulator tests (`functions/src/emulator-tests/security-rules.emulator-test.ts`) — not just written, verified. Real `firebase deploy` still needs to run from `lovedigitally-web/` (or with an explicit `--config`), since that's where the physical files live and where the Firebase CLI's project-directory check is satisfied natively.

## Local development

```bash
npm install
npm run dev                 # ionic serve, against local emulators by default (environment.ts: useEmulators: true)

# In a second terminal, from this directory:
npm run firebase:emulators  # Auth :9099, Firestore :8080, Storage :9199, Functions :5001, Hosting :5000, UI enabled
```

```bash
cd functions
npm install
npm run build:watch
```

### Real Firebase config

`src/environments/environment.ts` and `environment.prod.ts` contain **placeholder** values for the `lovedigitally-app` web config — real values (`apiKey`, `appId`, `messagingSenderId`) were not available when this scaffold was generated and must never be hand-typed into these files from memory or guesswork. Pull them from Firebase Console → `lovedigitally-app` → Project Settings → your web app, and inject them at build/CI time (e.g. a CI secret that does a token-replace on `environment.prod.ts` before `ng build --configuration production`). Local dev against the emulators does not need real values at all — the emulator suite ignores `apiKey`.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | `ionic serve` |
| `npm run build` / `npm run build:prod` | Angular build (dev / production) |
| `npm test` | Unit tests, headless Chrome, single run |
| `npm run test:watch` | Unit tests, watch mode |
| `npm run lint` | ESLint (includes the Clean Architecture import-boundary rule) |
| `npm run firebase:emulators` | Local Auth/Firestore/Storage/Functions/Hosting emulators |
| `npm run cap:sync` | Capacitor sync — inert until native builds are scheduled post-MVP |

## Architecture at a glance

```
src/app/                                                             (the Angular app)
├── domain/          framework-free models, rules, ports        (M1, extended in M2)
├── infrastructure/  Firebase adapters implementing those ports  (M3, M5 — not yet built)
├── application/     use-cases & Signal-based facades            (M3, M5)
├── features/        routed Ionic pages/components                (M3–M6)
├── shared/          dumb, reusable UI atoms                      (M3+)
└── core/            guards, error handling                       (M3+)

functions/src/                                                       (Cloud Functions — M2, complete)
├── schemas/         Zod request validation
├── callable/        thin onCall wrappers (validate -> usecase -> map errors -> log)
├── application/      6 use-cases orchestrating domain rules + stores
├── infrastructure/  Firestore/Storage/Auth adapters (transactional)
├── triggers/         reveal-image slicing (Storage-triggered)
└── emulator-tests/   real Firestore+Auth+Storage emulator coverage
```

Each layer's own `README.md` explains what belongs there and why. Full detail in `docs/puzzle-module/` (architecture, Firestore schema, security rules, Cloud Function contracts) and the Phase 3 test-data package (`docs/puzzle-module/test-data/`) for realistic fixtures to develop against.

## CI

`.github/workflows/puzzle-module-ci.yml` (repo root) lints, builds, and tests both this app and `functions/` — including `functions/`'s real emulator test suite, not just its mocked unit tests — on any push/PR touching `apps/puzzle-module/**` or the shared `lovedigitally-web/firestore.rules` / `storage.rules`. It's scoped by path so it never runs against unrelated changes elsewhere in this monorepo.

## Deploying (not yet done from this session)

Every gate `firebase deploy` should require — lint, unit tests, emulator tests, production build — passes, for both the app and `functions/`, from a clean install. **Actual deployment has not been run**: it requires real Firebase project credentials (`firebase login` + write access to `lovedigitally-app`) that don't exist in this development session. When ready:

```bash
# From lovedigitally-web/ (rules physically live there):
firebase deploy --only firestore:rules,storage --project lovedigitally-app

# From apps/puzzle-module/:
firebase deploy --only hosting:puzzle-module,functions:puzzle-module --project lovedigitally-app
```
