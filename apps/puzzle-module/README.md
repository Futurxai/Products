# Puzzle Module

Ionic Angular (standalone components + Signals) PWA for the Love Digitally Puzzle Module. See `docs/puzzle-module/` at the repo root for the full PRD, Module Contract, Phase 4 UI/UX spec, and Phase 5/6 architecture and roadmap this app implements.

## Status

**Milestone M0 — Environment & Infrastructure Setup.** The app boots (`AppComponent` → router → a placeholder page) and the project structure, Firebase wiring, and CI are in place. No real features yet — those land starting M1 (domain layer) and M3/M5 (Creator/Recipient UI).

## Firebase project

This app shares the **`lovedigitally-app`** Firebase project with `/lovedigitally-web` — it does not have its own project. Isolation comes from:

- A `puzzle_*` Firestore/Storage namespace (`puzzle_creators`, `puzzle_experiences`, `puzzle_experiences_private`, `puzzle_progress`, `puzzle_events`, `puzzle_storage/...`) that never collides with `lovedigitally_pages` / `lovedigitally_orders` / `lovedigitally_subscriptions` / `lovedigitally_webhook_events`.
- A dedicated Hosting site target, `puzzle-module` (see `.firebaserc`), so this app deploys to its own URL without touching the existing static site's Hosting config.
- A dedicated Functions **codebase**, `puzzle-module` (see `firebase.json`), so `firebase deploy --only functions:puzzle-module` never touches `publishPage` / `createOrder` / `verifyOrder` / `createSubscription` / `verifySubscription` / `razorpayWebhook`.

### ⚠️ Rules files are shared, not duplicated

`firebase.json` here points `firestore.rules` and `storage.rules` at `../../lovedigitally-web/firestore.rules` and `../../lovedigitally-web/storage.rules` — **the same physical files** `lovedigitally-web` deploys from. A Firestore project has exactly one deployed ruleset; these files are the single source of truth for both apps. This is deliberate (see Phase 5/6 architecture notes), not a mistake — never fork a separate rules file for this app.

**Known gap as of M0**: `../../lovedigitally-web/storage.rules` doesn't exist yet, and `firestore.rules` there doesn't yet contain the `puzzle_*` match blocks. That merge is Milestone M2's deliverable, not M0's — until then, `firebase deploy --only firestore:rules,storage` from this app will fail or deploy incomplete rules. Hosting and Functions deploys are unaffected.

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
src/app/
├── domain/          framework-free models, rules, ports        (M1)
├── infrastructure/  Firebase adapters implementing those ports  (M2)
├── application/     use-cases & Signal-based facades            (M3, M5)
├── features/        routed Ionic pages/components                (M3–M6)
├── shared/          dumb, reusable UI atoms                      (M3+)
└── core/            guards, error handling                       (M2)
```

Each layer's own `README.md` explains what belongs there and why. Full detail in `docs/puzzle-module/` (architecture, Firestore schema, security rules, Cloud Function contracts) and the Phase 3 test-data package (`docs/puzzle-module/test-data/`) for realistic fixtures to develop against.

## CI

`.github/workflows/puzzle-module-ci.yml` (repo root) lints, builds, and tests both this app and `functions/` on any push/PR touching `apps/puzzle-module/**`. It's scoped by path so it never runs against unrelated changes elsewhere in this monorepo.
