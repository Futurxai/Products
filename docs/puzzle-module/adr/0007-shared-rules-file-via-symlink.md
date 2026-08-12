# 0007. One physical Firestore/Storage rules file, symlinked, not duplicated

## Status

Accepted (M2, "Fix Firestore/Storage rules security gap + merge into lovedigitally-web").

## Context

Both `lovedigitally-web` and the Puzzle Module deploy to the same Firebase project ([ADR-0001](0001-shared-firebase-project-namespace-isolation.md)), which means they deploy to the **same live Firestore/Storage Rules** — Firebase has one active ruleset per project, not one per app. The Firebase CLI also only accepts a rules file path from within (or relative to) the directory it's deploying from — it cannot reference a file outside `apps/puzzle-module/` when deploying the Puzzle Module.

## Decision

`apps/puzzle-module/firestore.rules` and `apps/puzzle-module/storage.rules` are **symlinks** into `lovedigitally-web/firestore.rules`/`lovedigitally-web/storage.rules` — one physical file per rules type, referenced from two directories, never two files with the same intended content kept manually in sync.

## Consequences

- **Structurally impossible for the two apps' rules to drift**, the same guarantee [ADR-0006](0006-domain-sync-not-shared-package.md) gives the domain layer, achieved here by a filesystem symlink instead of a build step (appropriate since rules files aren't compiled/transformed, just deployed as-is).
- **A change to shared rules is real cross-app coupling, made visible rather than hidden.** Editing `lovedigitally-web/firestore.rules` for a Puzzle Module reason (adding a `puzzle_events` collection rule, say) is *editing a file `lovedigitally-web` also depends on* — `apps/puzzle-module/DEPLOYMENT.md`'s release checklist explicitly calls this out ("confirm `lovedigitally-web`'s own deploys aren't affected unexpectedly") specifically because the symlink makes the coupling structurally undeniable, not something a change could accidentally ship past unnoticed.
- **This is also the platform's highest-blast-radius rollback case** (`DEPLOYMENT.md`'s Rollback Plan): reverting Rules for a Puzzle Module problem affects `lovedigitally-web` too, and the checklist requires confirming with whoever owns that app's deploys first — a direct, named consequence of this decision, not a generic caveat.
- **Never accidentally replace the symlink with a real file.** Called out explicitly in `apps/puzzle-module/CLAUDE.md` — a well-meaning "let me just copy this in" would silently break the guarantee above and reintroduce the exact drift risk this decision exists to prevent.

## Alternatives considered

- **Two separate rules files, one per app, manually kept consistent for the collections they must agree on.** Rejected — Firebase doesn't even support two active rulesets per project, so this alternative isn't just worse, it's not actually possible; a symlink (or an equivalent single-source mechanism) is the only correct shape given the platform-level decision in [ADR-0001](0001-shared-firebase-project-namespace-isolation.md).
