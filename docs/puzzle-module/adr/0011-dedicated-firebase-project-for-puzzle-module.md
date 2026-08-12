# 0011. Migrate the Puzzle Module to its own dedicated Firebase project

## Status

Accepted. Supersedes [ADR-0001](0001-shared-firebase-project-namespace-isolation.md) (shared Firebase project with namespace isolation) and [ADR-0007](0007-shared-rules-file-via-symlink.md) (one physical rules file, symlinked).

## Context

ADR-0001 chose to share `lovedigitally-app` with `lovedigitally-web` rather than stand up a separate Firebase project for the Puzzle Module, on the grounds that no cross-app benefit existed at M0 and a separate project meant standing up separate billing/IAM/Auth for no immediate gain. ADR-0007 followed from that decision: since both apps deployed to one project, they necessarily deployed to one live Firestore/Storage ruleset, made safe via a filesystem symlink rather than two files kept manually in sync.

That tradeoff was explicitly revisited and reversed: the Puzzle Module is being moved to its own dedicated Firebase project, `lovedigitally-puzzle`, with its own registered Web App (`authDomain: lovedigitally-puzzle.firebaseapp.com`, `storageBucket: lovedigitally-puzzle.firebasestorage.app`, `messagingSenderId: 810137740688`, `appId: 1:810137740688:web:0c34b74e770d9be7e47f15`, `measurementId: G-ZHSM6803MM`). This record exists so a future reader of ADR-0001/ADR-0007 immediately sees that their conclusion no longer holds, rather than following stale guidance.

## Decision

Migrate the Puzzle Module off `lovedigitally-app` onto `lovedigitally-puzzle`:

- `.firebaserc`'s default project and Hosting target alias point at `lovedigitally-puzzle`.
- `firestore.rules`/`storage.rules` are now **standalone real files** in `apps/puzzle-module/`, containing only the `puzzle_*`/`puzzle_storage/` match blocks (the `lovedigitally_*` blocks that existed alongside them in the old shared file were dropped, since they were never this app's rules to own) plus the same default-deny catch-all — no longer symlinks into `lovedigitally-web/`.
- `functions/src/config/app-config.ts`'s `FIREBASE_PROJECT_ID` defaults to `lovedigitally-puzzle`, and `DEFAULT_STORAGE_BUCKET` resolves to the literal `lovedigitally-puzzle.firebasestorage.app` for that project id — the newer Firebase default bucket-domain convention, not the older `${projectId}.appspot.com` pattern ADR-0001-era tooling assumed.
- `src/environments/environment.ts`/`environment.prod.ts` carry the real, non-secret Web App config (`authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`, `measurementId`) directly — only `apiKey` (not provided as part of this migration) stays a build-time-injected placeholder via `scripts/apply-prod-env.mjs`.
- The `puzzle-module` Hosting site ID and Functions codebase ID are unchanged — only the project they deploy into changed.
- The `puzzle_*`/`puzzle_storage/` collection and path prefixes are unchanged — renaming a live collection is a data migration, not a config change, and is out of scope here. They no longer serve a collision-avoidance purpose against `lovedigitally_*`, but changing them isn't free, so they stay.

## Consequences

- **No more shared blast radius at the project level.** A catastrophic Firebase-project-level failure (billing suspension, project deletion) on `lovedigitally-puzzle` no longer has any way to affect `lovedigitally-web`, and vice versa — the risk ADR-0001 accepted as unlikely-but-shared no longer exists.
- **Firestore/Storage Rules can now drift.** ADR-0007's structural guarantee (one physical file, same inode, cannot drift) is gone. This module's rules are now maintained independently, verified only by its own emulator test suite (`security-rules.emulator-test.ts`, `storage-rules.emulator-test.ts`, now reading the standalone files directly) — a `lovedigitally-web`-side rules fix has no way to reach this app anymore, and vice versa. Accepted deliberately as part of this migration.
- **No more shared Auth user pool.** A Creator's Firebase Auth identity on `lovedigitally-puzzle` is now entirely separate from anything on `lovedigitally-app`. `PLATFORM-ARCHITECTURE.md`'s proposed multi-module platform (which assumed one shared Auth pool across modules, per its §3) no longer matches this module's actual deployment — that document needs its own review before any future module implementation proceeds against it.
- **Deploy commands simplified.** Every `firebase deploy` for this app now runs entirely from `apps/puzzle-module/`, with no cross-directory symlink target and no `lovedigitally-web` coordination step in the release checklist.
- **One-time project setup is required again.** `lovedigitally-puzzle` is a fresh project — Hosting site creation, Authentication provider setup (Email/Password, Google, Anonymous), and App Check registration all need to be performed from scratch; nothing is inherited from `lovedigitally-app`'s existing configuration.
- **CI/CD secret surface shrank.** Since the Web App config (aside from `apiKey`) is now committed directly (non-secret by Firebase's own design, and already known for this project), the deploy workflow needs one fewer repository secret (`FIREBASE_SENDER_ID`/`FIREBASE_APP_ID` dropped; `FIREBASE_API_KEY` and `FIREBASE_SERVICE_ACCOUNT_KEY` remain).

## Alternatives considered

- **Stay on the shared `lovedigitally-app` project** (ADR-0001's original decision). Rejected for this migration — superseded by an explicit decision to give the Puzzle Module its own project, made independently of this document.
- **Keep the rules symlinked to a `lovedigitally-web`-relative path even after changing projects.** Not possible: Firebase deploys one ruleset per project, and the symlink's entire justification (ADR-0007) was that both apps deployed to the *same* project. Once they deploy to different projects, a shared physical file stops making sense — each project needs its own ruleset.
