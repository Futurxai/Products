# core/

Cross-cutting Angular concerns that don't belong to any one feature.

- `guards/` — `creator-auth.guard.ts` (redirects to `/auth/login?returnUrl=...` unless signed in — waits for `AuthFacade.authReady()` first so a page refresh mid-session-restore doesn't flash a false redirect), `guest.guard.ts` (the inverse — keeps an already-signed-in Creator off the auth pages), `wizard-unsaved-changes.guard.ts` (a `CanDeactivateFn` — prompts before leaving the Wizard with an autosave still pending).
- `forms/` — `auth-form-validators.ts`, `ValidatorFn` adapters over `domain/rules/auth-validation.rules.ts` — Angular Forms types live here, not in `domain/`, so the underlying rules stay framework-free.
- `network/` — `network-status.service.ts` (M5 Phase 5): a signal wrapping `navigator.onLine` + the browser's `online`/`offline` events — the one place in the app allowed to touch them directly. Advisory only (`shared/offline-banner/` is its one consumer); nothing is blocked on it.

Added starting Milestone M3 (auth guards, once `AuthFacade` landed).
