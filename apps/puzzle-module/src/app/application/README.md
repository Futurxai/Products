# application/

Use-case orchestration. Each file does one job — calls one or more `domain/ports`, applies `domain/rules`, and exposes the result to the presentation layer via a signal-based facade. This is the layer `features/*` pages actually inject; they never reach past it into `infrastructure/` directly.

- `creator/` — `create-experience.usecase.ts`, `publish-experience.usecase.ts`, `creator-dashboard.facade.ts`.
- `recipient/` — `resolve-link.usecase.ts`, `submit-answer.usecase.ts`, `request-clue.usecase.ts`, `request-partner-help.usecase.ts`, and `puzzle-session.facade.ts` — the central Angular Signals store for an active recipient session (see Phase 5 §8, State Management).

Added starting Milestone M3 (creator use-cases) and M5 (recipient use-cases).
