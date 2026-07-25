# 0006. Copy the domain layer into `functions/`, don't share it via an npm package

## Status

Accepted (M2). Revisit if a second Cloud Functions codebase (a future platform module, see `PLATFORM-ARCHITECTURE.md` §10) needs the same domain models — see Consequences.

## Context

The Angular app's `domain/` layer (models like `QuestionDefinition`, rules like `pointsForPiece`/`starRatingFor`) and the Cloud Functions codebase both need the exact same answers to "how many points is this piece worth" and "what does a valid question look like" — see [ADR-0002](0002-clean-architecture-layering.md). They're two separate `package.json`s, two separate `tsconfig.json`s, two separate build/deploy pipelines (`apps/puzzle-module/` builds with Angular CLI; `apps/puzzle-module/functions/` builds with plain `tsc`).

## Decision

`functions/src/domain/` is a **generated, gitignored copy** of `src/app/domain/`, produced by `functions/scripts/sync-domain.mjs` and run automatically before every build (`npm run build`'s `prebuild` hook) and before every lint (`npm run lint`). The canonical, hand-edited copy lives in exactly one place — the Angular app's `src/app/domain/` — and the Functions codebase's copy is regenerated, never hand-edited.

## Consequences

- **Zero drift is structurally guaranteed, not just disciplined.** There's no way for the two copies to diverge, because one of them is never edited — a full rebuild always regenerates it from the source of truth. A hand-edit to `functions/src/domain/` would be silently overwritten on the next build, a fail-safe rather than a fail-silent-wrong behavior.
- **No published/versioned package, no version-mismatch risk, no publish step to forget.** A shared npm package (even a private, workspace-local one) would need its own version bump + install step every time a domain rule changed, adding friction and a new way for the two runtimes to be running different versions.
- **Doesn't scale cleanly to a second Cloud Functions codebase needing the same domain layer.** A future platform module (`PLATFORM-ARCHITECTURE.md` §10) with its own Functions codebase would need either its own copy of this exact sync script pointed at a domain layer it doesn't share meaning with (wrong — each module's domain is genuinely its own), or, for any domain concepts a platform genuinely wants shared across modules (e.g. a future shared gameplay-scoring package, flagged as premature in that document's §11), a real shared package would become the right tool at that point specifically because "one canonical copy, generated into N consumers" stops being simpler than "one versioned package, N consumers" once N > 2. Not a defect in this decision for its actual scope (one app, one Functions codebase) — a boundary condition to revisit if the scope changes.
- **A build-time step that must never be forgotten.** `prebuild`/`pretest:emulator`-style automatic hooks (not a manual step someone has to remember) are the actual mitigation — reviewed and treated as load-bearing, not optional tidiness.

## Alternatives considered

- **A shared npm workspace package** (`packages/puzzle-domain`), imported by both. Rejected at this scope: added a publish/version step for no benefit when there are only ever two consumers, both in the same monorepo, both building from the same commit.
- **Hand-copy-paste, updated manually when either side changes.** Rejected outright — the exact drift risk a generated copy exists to eliminate.
