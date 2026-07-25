# Developer Onboarding Guide — Puzzle Module

Start here if you're new to this app. It assumes you can already use git/npm/a terminal, and explains everything specific to this codebase — not general Angular/Firebase teaching material.

## 1. Prerequisites

- **Node 20** (`engines.node` in both `package.json` and `functions/package.json` — the app pins `>=20.0.0`, Functions pins exactly `20` to match the Cloud Functions runtime).
- **Java 11+** — required by the Firestore emulator (part of the Firebase emulator suite), not by anything in this app's own code. If `npm run firebase:emulators` fails immediately with a Java-related error, this is why.
- **The Firebase CLI**, installed as a dev dependency (`firebase-tools` in `package.json`) — invoke it via `npx firebase ...` or the npm scripts below; don't assume a global install.
- No Firebase account or project access is needed for local development — everything runs against local emulators by default (`src/environments/environment.ts`'s `useEmulators: true`). You only need real Firebase credentials to deploy (see `DEPLOYMENT.md`), not to build or test.

## 2. First-time setup

```bash
cd apps/puzzle-module
npm ci                    # app dependencies
cd functions && npm ci    # Cloud Functions dependencies (separate package.json, separate install)
cd ..
```

That's it — no `.env` file to create, no secrets to obtain. `src/environments/environment.ts` (development config) ships with placeholder Firebase Web SDK values that are only ever used against the local emulators, which don't validate them.

**Verify the setup**: `npm run lint && npm test` (app) and, inside `functions/`, `npm run lint && npm test`. All should pass on a clean checkout — if they don't, something is wrong with the setup, not with the code.

## 3. Running the app locally

Two things need to be running together for real end-to-end interaction (the app calling real Cloud Functions/Firestore/Auth/Storage, not mocks):

```bash
# Terminal 1, from apps/puzzle-module/
npm run firebase:emulators   # Auth :9099, Firestore :8080, Storage :9199, Functions :5001, Hosting :5000, Emulator UI :4000

# Terminal 2, from apps/puzzle-module/
npm start                    # ng serve, http://localhost:4200 — points at the emulators above by default
```

Open `http://localhost:4200`. The Emulator UI (`http://localhost:4000`) is genuinely useful for debugging — it lets you browse Firestore documents and Auth users as the app creates them, and shows Functions logs live.

**If you only need the Angular app and don't need real Cloud Functions calls to succeed** (e.g. working on a pure UI change), `npm start` alone is fine — pages that don't call a Cloud Function work without the emulators running; ones that do will show a network error, which is expected, not a bug.

## 4. Project structure

Two independent codebases in this directory, each with Clean Architecture layering — see `docs/puzzle-module/adr/0002-clean-architecture-layering.md` for the reasoning, not repeated here.

```
apps/puzzle-module/
├── src/app/
│   ├── domain/          Framework-free models, business rules, port interfaces.
│   │                    No import of firebase/*, @angular/fire/*, or Angular/Ionic symbols — ESLint-enforced.
│   ├── application/     Signal-based facades — orchestrate domain rules against ports. One facade per feature area
│   │                    (auth.facade.ts, puzzle-wizard.facade.ts, puzzle-session.facade.ts, ...).
│   ├── infrastructure/  The ONLY layer allowed to import firebase/*/@angular/fire/* — implements domain/ports/*.
│   ├── features/        Routed Ionic pages/components, one folder per route area (creator/auth, creator/dashboard,
│   │                    creator/wizard, creator/preview, creator/publish, recipient/).
│   ├── shared/          Dumb, reusable UI atoms (button, input, textarea, card, toast, modal, badge, avatar, ...) —
│   │                    thin wrappers over Ionic primitives, not hand-rolled controls.
│   └── core/             Route guards, error handling, network status.
│
└── functions/src/                                    (Cloud Functions — a SEPARATE package.json/tsconfig)
    ├── domain/           GENERATED, gitignored copy of src/app/domain/ — never hand-edit, see §6 below.
    ├── schemas/          Zod request validation, one file per callable.
    ├── callable/         Thin onCall wrappers (validate -> usecase -> map errors -> log) — see define-callable.ts.
    ├── application/       6 use-cases, one per callable, orchestrating domain rules + infrastructure ports.
    ├── infrastructure/   Firestore/Storage/Auth adapters (transactional where it matters).
    ├── triggers/          Reveal-image slicing (Storage-triggered, runs after a Creator uploads).
    └── emulator-tests/   Real Firestore+Auth+Storage emulator integration tests (not the mocked unit specs).
```

Import aliases (`tsconfig.json`'s `paths`): `@domain/*`, `@application/*`, `@infrastructure/*`, `@features/*`, `@shared/*`, `@core/*`, `@env/*` — always use these, never a relative `../../../` path across a layer boundary; it's both the convention and what keeps the ESLint boundary rule (§5) meaningful.

## 5. Coding standards

- **The Clean Architecture import boundary is enforced by ESLint, not just convention** (`.eslintrc.json`'s `no-restricted-imports` rule over `domain/`, `application/`, `features/`, `shared/`): importing `firebase/*` or `@angular/fire/*` outside `infrastructure/` fails lint. If you find yourself wanting to do this, you're almost always missing a port method — add one to the relevant `domain/ports/*.port.ts` interface and implement it in `infrastructure/`, don't reach around the boundary.
- **Every Firebase Auth error is mapped to a typed error class** (`domain/errors/auth-errors.ts`) with an already-UI-ready message — never let a raw `FirebaseError` reach a page component.
- **Server-side business-rule failures resolve, they don't reject.** `functions/src/callable/define-callable.ts`'s wrapper turns a thrown `DomainError` into a resolved `{ ok: false, error, message, details }`, matching `PuzzleApiPort`'s `ApiFailure` shape — write client code that checks `result.ok`, not a `try/catch` around every gameplay call expecting a rejection for a wrong answer. See `docs/puzzle-module/CLOUD-FUNCTIONS-API.md` for the full contract.
- **Never trust the client for correctness.** If you're adding anything that resembles "check if this answer is right" or "reveal this image," the check belongs in a Cloud Function, server-side, full stop — see `docs/puzzle-module/adr/0004-server-authoritative-gameplay.md`. The one narrow exception (the Creator's own ephemeral Preview) is already built and explained in that ADR; don't extend the exception, add a new server-validated path if you need something similar elsewhere.
- **Comments explain WHY, not WHAT.** This codebase's existing comments are unusually dense with rationale (a past decision, a subtle invariant, a bug that was fixed and why) — match that style if you add one; don't add a comment that just restates what the next line of code already says.
- **No premature abstraction.** Don't build a second consumer's worth of flexibility for a pattern that only has one consumer today — several ADRs (e.g. `docs/puzzle-module/adr/0006-domain-sync-not-shared-package.md`) explicitly call out where a "more scalable" alternative was rejected for exactly this reason, and flag the actual condition under which it'd be worth revisiting.

## 6. Local development workflow — the gotchas worth knowing up front

- **Edited something in `functions/src/domain/`? You edited the wrong file.** It's a generated copy of `src/app/domain/`, regenerated automatically before every Functions build/lint/test (`prebuild`/`lint`'s `sync-domain` step) — see `docs/puzzle-module/adr/0006-domain-sync-not-shared-package.md`. Edit `src/app/domain/` instead; your Functions-side edit will be silently overwritten on the next build.
- **`npm run lint`/`npm test` inside `functions/` auto-run `sync-domain` first** — if the Angular app's domain layer doesn't compile, the Functions codebase's own lint/test will fail too, even if nothing in `functions/` itself is broken. Fix the Angular side first.
- **Headless Chrome for Karma needs `CHROME_BIN` set in some environments** — if `npm test` fails with "No binary for ChromeHeadless browser on your platform," set `CHROME_BIN` to your system's Chrome/Chromium executable path before running it. Not needed in every environment (CI has its own setup), but common enough in fresh sandboxes/containers to call out here rather than let it look like a broken test suite.
- **Testing anything that generates a Firebase Storage signed URL against the emulator** (any of `submitAnswer`/`requestPartnerHelpReveal`/`getCompletionSummary`) needs `GOOGLE_APPLICATION_CREDENTIALS` pointed at a local signing key — the Functions emulator has no real GCP metadata server to sign against otherwise, and you'll see a `SigningError`/403 from `gcp-metadata`. `functions/scripts/generate-fake-service-account.mjs` generates a throwaway one for exactly this; `functions/package.json`'s `test:emulator` script and the app's own `test:e2e` script (see `README.md` → End-to-End UAT) both already wire this up correctly — copy their pattern if you're writing a new script that needs it, don't rediscover the problem from scratch.
- **A missing Karma-vs-real-DOM gap bit this project once already** — the end-to-end UAT (`e2e/creator-to-recipient.spec.ts`) found a real bug (a missing `FormsModule` import that made a `<form (ngSubmit)>` silently never fire for a real click) that 550 passing Karma specs never caught, because the affected spec called the handler method directly instead of dispatching a real DOM event. If you're testing a component with a `<form>`, prefer triggering it the way a real user would (click the submit button, or `form.dispatchEvent(new Event('submit', ...))`) over calling the handler method directly — see the regression-guard tests added to `question-modal.component.spec.ts` (both the Recipient's and the Creator Preview's) for the pattern.
- **Autosave, unsaved-changes guards, and debounced writes are already built into the Wizard** (`PuzzleWizardFacade`) — if you're adding a new field to the wizard, wire it through the existing facade/autosave path rather than adding a parallel save mechanism.

## 7. Testing

| Layer | Command | What it covers |
|---|---|---|
| Angular unit/component specs (Karma) | `npm test` (from `apps/puzzle-module/`) | Domain rules, facades (mocked ports), components (mocked facades). Fast, no real Firebase. |
| Functions unit specs (Jasmine) | `npm test` (from `functions/`) | Use-cases with mocked stores, error mapping. Fast, no real Firebase. |
| Functions emulator integration tests | `npm run test:emulator` (from `functions/`) | Real Firestore/Auth/Storage emulators via the Admin SDK — Rules-bypassing, so it verifies business logic against real infrastructure, not Rules enforcement. |
| **End-to-end UAT (Playwright)** | `npm run test:e2e` (from `apps/puzzle-module/`) | The real browser UI, driven end-to-end, against real emulators AND real Firestore/Storage Rules. The only layer that verifies a real `<form>` submits and a real Creator can actually create a puzzle under real security rules — see `README.md` → End-to-End UAT for why this layer matters and what it's already caught. |

Run all four before considering a change to gameplay, forms, or security rules complete — each one covers a gap the others structurally cannot (see the table's last column).

## 8. Where to look next

- **`README.md`** — the fullest per-milestone technical detail (what was built, why, and what was found along the way, M0 through the Final Pre-Launch Tasks).
- **`docs/puzzle-module/adr/`** — the ten key design decisions, with context and alternatives considered.
- **`docs/puzzle-module/CLOUD-FUNCTIONS-API.md`** — the full request/response/error-code contract for every callable.
- **`docs/puzzle-module/PLATFORM-ARCHITECTURE.md`** — how this app fits into a future multi-module platform (planning only, nothing built yet).
- **`DEPLOYMENT.md`** — deployment, rollback, and the release checklist.
- **`M5-DELIVERABLES.md`** — the consolidated performance/accessibility/security/production-readiness report and known limitations.
