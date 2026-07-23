# application/

Use-case orchestration. Each file does one job — calls one or more `domain/ports`, applies `domain/rules`, and exposes the result to the presentation layer via a signal-based facade. This is the layer `features/*` pages actually inject; they never reach past it into `infrastructure/` directly.

- `creator/` — `auth.tokens.ts` (DI tokens for `AuthPort`/`CreatorRepositoryPort`), `auth.usecase.ts`, `auth.facade.ts` (the Signal store `features/creator/auth/*` pages and the auth guards inject); `experience.tokens.ts` (DI token for `ExperienceRepositoryPort`), `creator-dashboard.facade.ts` (loads the signed-in Creator's experiences, exposes `groups`/`summary` derived from `domain/rules/dashboard.rules.ts`); `create-experience.usecase.ts`, `publish-experience.usecase.ts` (M3 Feature 3+).
- `recipient/` — `resolve-link.usecase.ts`, `submit-answer.usecase.ts`, `request-clue.usecase.ts`, `request-partner-help.usecase.ts`, and `puzzle-session.facade.ts` — the central Angular Signals store for an active recipient session (see Phase 5 §8, State Management).

Unlike `domain/`, this layer *is* Angular-aware (`@Injectable`, Signals, DI tokens) — the ESLint import boundary only forbids `firebase/*`/`@angular/fire/*` here, not Angular itself. Facades are what pages inject; use-cases are what facades depend on; ports (defined in `domain/`, bound to implementations via DI tokens declared alongside the use-case that needs them) are what use-cases depend on.

Added starting Milestone M3 (creator auth + use-cases) and M5 (recipient use-cases).
