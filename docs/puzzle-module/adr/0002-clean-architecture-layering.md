# 0002. Clean Architecture layering (domain / application / infrastructure / features)

## Status

Accepted (M0–M1). Enforced by ESLint import-boundary rules, not just convention.

## Context

Both the Angular app and the Cloud Functions codebase needed a structure that (a) kept business rules (what counts as a correct answer, how scoring works, when a piece unlocks) testable without a browser, an emulator, or a network call, and (b) kept Firebase-specific code (Firestore SDK calls, Storage SDK calls, Auth SDK calls) from leaking into that logic, since the same business rules are needed in two runtimes — the client (for instant local feedback in the Creator's Preview) and the server (as the actual source of truth, see [ADR-0004](0004-server-authoritative-gameplay.md)).

## Decision

Four layers, both in the Angular app (`src/app/`) and in Cloud Functions (`functions/src/`):

- **`domain/`** — framework-free models, business rules, and ports (interfaces). No import of `firebase/*`, `@angular/fire/*`, `firebase-admin`, or any Angular/Ionic symbol. Pure TypeScript, unit-testable with zero setup.
- **`application/`** — use-cases (Cloud Functions side) or Signal-based facades (Angular side) that orchestrate domain rules against ports.
- **`infrastructure/`** — the only layer allowed to import `firebase/*`/`@angular/fire/*` (Angular) or `firebase-admin` (Functions). Implements the ports `domain/` declares.
- **`features/`** (Angular only) — routed Ionic pages/components. Consume `application/` facades, never touch `infrastructure/` or Firebase SDKs directly.

Enforced by ESLint (`.eslintrc.json`), not left to code review discipline alone — an import of `firebase/*` from `domain/`, `application/`, or `features/` fails lint.

## Consequences

- **The same business rules run in two places without duplication risk being silent.** `domain/rules/gameplay.rules.ts` (client-side, used only by the Creator's ephemeral Preview) and `functions/src/application/submit-answer.usecase.ts` (server-side, the real source of truth) are deliberately *not* required to share code — see [ADR-0004](0004-server-authoritative-gameplay.md) for why Preview is allowed its own local copy of the state machine shape. Where sharing *is* required (the domain models and pure rules both runtimes need identical answers from — scoring, question/piece schemas), it's solved by [ADR-0006](0006-domain-sync-not-shared-package.md), not by this layering decision alone.
- **Ports make testing cheap.** Every domain rule is unit-tested with plain function calls, no TestBed, no emulator — the fast, high-volume layer of the test pyramid. Slower, real-infrastructure tests (Karma component specs, Firestore/Auth/Storage emulator tests) only need to cover the `infrastructure/`/`features/` seams, not re-verify business logic those seams don't contain.
- **A real cost: more files, more indirection for a small team.** A single "just call Firestore from the component" approach would have shipped M0–M2 faster. Accepted because this project's business rules (scoring, clue ladders, partner-help unlock conditions) are genuinely nontrivial and needed changing/testing repeatedly across M1–M5 — the layering paid for itself specifically because the domain kept changing, not as a blanket best practice applied without reason.

## Alternatives considered

- **Firestore calls directly in Angular components/services**, the common "quick CRUD app" shape. Rejected early (M0) specifically because the product's core mechanic (a Recipient earning pieces via server-validated answers) was known from the PRD to require careful client/server trust boundaries — see [ADR-0004](0004-server-authoritative-gameplay.md) — which this shape makes much easier to accidentally violate (a component with a Firestore reference in scope is one careless line away from a client-side correctness check).
