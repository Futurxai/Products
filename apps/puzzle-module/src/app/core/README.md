# core/

Cross-cutting Angular concerns that don't belong to any one feature.

- `guards/` — `creator-auth.guard.ts` (redirects to `/auth/login?returnUrl=...` unless signed in — waits for `AuthFacade.authReady()` first so a page refresh mid-session-restore doesn't flash a false redirect), `guest.guard.ts` (the inverse — keeps an already-signed-in Creator off the auth pages), `experience-editable.guard.ts` (blocks editing once a `puzzle_progress` doc exists, per PRD Business Rule #10, M4), `recipient-link.resolver.ts` (M5).
- `forms/` — `auth-form-validators.ts`, `ValidatorFn` adapters over `domain/rules/auth-validation.rules.ts` — Angular Forms types live here, not in `domain/`, so the underlying rules stay framework-free.
- `error/` — `global-error-handler.ts` (M4+).

Added starting Milestone M3 (auth guards, once `AuthFacade` landed).
