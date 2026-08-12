# 0001. Shared Firebase project with namespace isolation, not a project per app

## Status

Accepted (M0). Generalized as a platform-wide pattern in `PLATFORM-ARCHITECTURE.md` §1. **Superseded by [ADR-0011](0011-dedicated-firebase-project-for-puzzle-module.md)** — the Puzzle Module was migrated to its own dedicated Firebase project (`lovedigitally-puzzle`); it no longer shares a project with `lovedigitally-web`. This record is kept for history — the decision and reasoning below applied at the time it was made, but no longer describes the current architecture.

## Context

The Puzzle Module needed a Firebase project from the first day of scaffolding (M0). A separate `lovedigitally-web` app (a static marketing/premium site with its own Cloud Functions for orders/subscriptions) already existed and already owned a Firebase project, `lovedigitally-app`. The question: give the Puzzle Module its own new Firebase project, or share `lovedigitally-app`.

## Decision

Share `lovedigitally-app`. Isolate the Puzzle Module from `lovedigitally-web` by:
- Namespacing every Firestore collection (`puzzle_experiences`, `puzzle_experiences_private`, `puzzle_progress`, `puzzle_events`, `puzzle_creators`) and every Storage path (`puzzle_storage/...`) with a `puzzle_`/`puzzle_storage/` prefix.
- Deploying to a dedicated Hosting site (`puzzle-module`) and a dedicated Cloud Functions codebase (`puzzle-module`), both within the one project, rather than the project's default site/codebase.
- Enforcing the namespace boundary in Firestore/Storage Rules — the same rules file the whole project shares (see [ADR-0007](0007-shared-rules-file-via-symlink.md)) explicitly matches on the `puzzle_*` prefix, so nothing in `lovedigitally-web`'s own collections is reachable from Puzzle Module code, and vice versa.

## Consequences

- **One Auth user pool.** A future shared-Creator-identity platform (see `PLATFORM-ARCHITECTURE.md` §3) doesn't need federated auth across projects — this was a load-bearing enabler for that later platform plan, discovered as a benefit rather than planned as one at the time.
- **Shared blast radius at the project level.** A catastrophic Firebase-project-level failure (billing suspension, project deletion) takes down both apps together. Accepted as unlikely relative to the operational cost of running two projects (two sets of billing, two sets of IAM, two Auth pools to reconcile if identity is ever shared).
- **Firestore/Storage Rules become a shared, growing file.** Every new namespace (this module or a future one) adds to one file both apps' teams must review changes to. Mitigated, not eliminated, by [ADR-0007](0007-shared-rules-file-via-symlink.md)'s symlink discipline and by the Puzzle Module's own emulator test coverage of every rule it depends on.
- **Deploy isolation still holds.** Because Hosting site and Functions codebase are separate, a bad Puzzle Module deploy cannot take down `lovedigitally-web`'s Hosting or its own Functions, even though they share a project — confirmed by `apps/puzzle-module/firebase.json`'s explicit `hosting.target`/`functions[0].codebase` fields.

## Alternatives considered

- **A dedicated Firebase project for the Puzzle Module.** Rejected: no cross-app benefit at M0 (no shared-identity plan existed yet), and it would have meant standing up separate billing/IAM/Auth for a module whose entire security model (Firestore/Storage Rules) already needed building regardless of project boundary.
