# core/

Cross-cutting Angular concerns that don't belong to any one feature.

- `guards/` — `creator-auth.guard.ts`, `experience-editable.guard.ts` (blocks editing once a `puzzle_progress` doc exists, per PRD Business Rule #10), `recipient-link.resolver.ts`.
- `error/` — `global-error-handler.ts`.

Added starting Milestone M2 (guards depend on the Auth infrastructure landing first).
