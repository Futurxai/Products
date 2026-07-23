# Puzzle Module

Ionic Angular (standalone components + Signals) PWA for the Love Digitally Puzzle Module. See `docs/puzzle-module/` at the repo root for the full PRD, Module Contract, Phase 4 UI/UX spec, and Phase 5/6 architecture and roadmap this app implements.

## Status

**Milestone M3, Feature 3 — Puzzle Creation Wizard complete.** M0 (scaffold/CI), M1 (domain layer), M2 (all 6 Cloud Functions + image-slice trigger), M3/Feature 1 (Authentication), M3/Feature 2 (Dashboard), and M3/Feature 3 (Wizard) are done and fully validated. Still to come in M3: Preview (Feature 4), Publish (Feature 5) — then M5 for the Recipient side.

See `functions/src/` for the Cloud Functions codebase: `schemas/` (Zod), `callable/` (thin onCall wrappers), `application/` (use-cases), `infrastructure/` (Firestore/Storage/Auth adapters), `triggers/` (reveal-image slicing), `emulator-tests/` (real Firestore+Auth+Storage emulator coverage, run via `npm run test:emulator` inside `functions/`).

### Creator Authentication (M3, Feature 1)

- **Pages** (`src/app/features/creator/auth/`): `login/`, `signup/`, `forgot-password/`, sharing a feature-local `ui/auth-shell.component.ts` layout.
- **Design system** (`src/app/shared/`): `button/`, `input/` (a `ControlValueAccessor` wrapping `ion-input`), `card/`, `toast/` (signal-based queue + host, mounted once in `AppComponent`), `loader/` — thin, opinionated wrappers over Ionic primitives rather than hand-rolled controls. The rest of the Phase 4 component set is added incrementally as later features need it, not built ahead of a consumer.
- **Auth architecture**: `AuthPort` (Firebase Auth identity) and `CreatorRepositoryPort` (the `puzzle_creators` Firestore profile) are deliberately separate ports — Auth owns the session, Firestore owns app-specific profile fields. `AuthUseCase.resolveProfile()` provisions a Creator's Firestore doc on first sight (fresh sign-up, or a first-time Google sign-in) and self-heals it on every session restore if it's ever missing. `AuthFacade` is the Signal store pages and `creatorAuthGuard`/`guestGuard` actually consume — it waits for `authReady()` before either guard makes a redirect decision, so a page refresh mid-session-restore never flashes a false redirect to `/auth/login`.
- Every Firebase Auth error is mapped to a typed `AuthError` subclass (`domain/errors/auth-errors.ts`) with an already-UI-ready message — pages never see a raw `FirebaseError`.
- The production bundle budget (`angular.json`) was raised from 750kb/950kb to 900kb/1.1mb warning/error — the increase reflects real, necessary weight (Firebase Auth/Firestore's modular functions are now actually *called*, not just provided; more Ionic form components), not unreviewed bloat; still enforced, just recalibrated.

### Creator Dashboard (M3, Feature 2)

- **Page** (`src/app/features/creator/dashboard/dashboard.page.ts`): replaces the Feature 1 placeholder. Welcome header with a profile-menu popover (sign out), an Analytics Summary card (total/draft/published/completed counts), and Draft/Published/Completed sections rendering `ui/experience-card.component.ts` items. Loading/error/empty states are all real, driven by `CreatorDashboardFacade`.
- **"Create New Puzzle" opens the Wizard** at `/creator/wizard/new`, and draft cards are clickable to resume editing at `/creator/wizard/{experienceId}` — both wired in Feature 3. Published/completed cards stay non-interactive: there's no Preview/detail destination for them yet (Features 4-5).
- **`FirestoreExperienceRepository`** splits/merges every `PuzzleExperience` across `puzzle_experiences` (public) and `puzzle_experiences_private` (owner-only) — the exact same schema `functions/src/infrastructure/firestore-experience.store.ts` (M2) already reads/writes via the Admin SDK. `update()` only ever touches Wizard-editable fields (`revealImagePath` is explicitly excluded — trigger-only, see Feature 3 below); status transitions stay Cloud-Function-only. The `listByCreator` query (`where(creatorId==).orderBy(createdAt desc)`) was verified directly against the real Firestore emulator before being relied on, rather than assumed — no extra composite index turned out to be needed beyond Firestore's automatic indexing for this shape.
- **Dashboard grouping/summary** (`domain/rules/dashboard.rules.ts`) is framework-free and unit-tested on its own — `published` and `in_progress` are grouped together (both read as "live" to a Creator), `archived` is excluded entirely (no archive view yet).

### Puzzle Creation Wizard (M3, Feature 3)

- **`WizardPage`** (`src/app/features/creator/wizard/wizard.page.ts`), routed at `/creator/wizard/:experienceId`: resolves the `new` sentinel by minting a fresh draft (`crypto.randomUUID()`) and replacing the URL with the real id, or loads an existing draft to resume. Renders a `StepperComponent`, autosave status text, and the current step via `@switch` over `PuzzleWizardFacade.currentStep()`. Step navigation is always free (never gated on completion) — the true hard gate is the eventual Publish action (Feature 5), via the pre-existing `canPublish()`.
- **Six steps** (`features/creator/wizard/steps/`): Occasion & Emotion, Image Upload (with a hand-rolled canvas pan/zoom cropper, `ui/image-cropper.component.ts` — no third-party dependency, to avoid further bundle pressure and to keep full control over accessibility), Recipient Details, Questions (exactly 9, each with up to 3 clues via `ui/question-editor.component.ts`), Completion Details, and a read-only Review summary. "Preview experience" and "Publish" on Review are deliberately inert beyond a toast — Features 4 and 5 aren't built yet.
- **`PuzzleWizardFacade`** (`application/creator/puzzle-wizard.facade.ts`) owns all wizard state as Signals and debounced autosave (800ms, optimistic local merge + retry on failure) — every meaningful change is saved without an explicit "Save" action.
- **Unsaved-change protection** is two-layer: `wizardUnsavedChangesGuard` (`CanDeactivateFn`, covers in-app Router navigation) plus a `beforeunload` listener on `WizardPage` (covers real tab close/refresh, which Router guards never see).
- **Image upload**: `StorageUploadPort`/`FirebaseStorageUploadService` upload the creator's cropped original to `puzzle_storage/{creatorId}/{experienceId}/reveal-image-original.{ext}`. The Wizard only ever shows a local `URL.createObjectURL()` preview of what was just cropped — Storage Rules only grant a Creator read access to their own original upload, never the server-processed `reveal-image.jpg` that `revealImagePath` points to (set asynchronously by the `onRevealImageUploaded` Cloud Function trigger).
- The production bundle budget (`angular.json`) was raised from 900kb/1.1mb to 1.35mb/1.6mb warning/error — the increase reflects the Wizard's real new weight (canvas cropper, 6 step components, Storage SDK usage now actually exercised), not unreviewed bloat; still enforced, just recalibrated.

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
