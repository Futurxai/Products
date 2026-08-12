# Architecture Decision Records — Puzzle Module

One file per decision, numbered in the order they were made (not necessarily the order listed here — see each record's own history). Format: lightweight MADR (Context / Decision / Consequences / Alternatives Considered). A record is never edited to pretend a past decision was different — if a decision changes, a new record supersedes the old one and says so explicitly; the old one stays, marked superseded.

| # | Title | Status |
|---|---|---|
| [0001](0001-shared-firebase-project-namespace-isolation.md) | Shared Firebase project with namespace isolation, not a project per app | Superseded by 0011 |
| [0002](0002-clean-architecture-layering.md) | Clean Architecture layering (domain / application / infrastructure / features) | Accepted |
| [0003](0003-split-public-private-experience-documents.md) | Split every `PuzzleExperience` across a public and a private Firestore document | Accepted |
| [0004](0004-server-authoritative-gameplay.md) | Server-authoritative gameplay — never trust the client for correctness | Accepted |
| [0005](0005-anonymous-recipient-identity.md) | Anonymous, custom-claim-scoped Recipient identity — no login screen | Accepted |
| [0006](0006-domain-sync-not-shared-package.md) | Copy the domain layer into `functions/`, don't share it via an npm package | Accepted |
| [0007](0007-shared-rules-file-via-symlink.md) | One physical Firestore/Storage rules file, symlinked, not duplicated | Superseded by 0011 |
| [0008](0008-write-only-analytics-collection.md) | Analytics as a write-only-from-Cloud-Functions Firestore collection | Accepted |
| [0009](0009-no-runtime-caching-for-signed-urls.md) | PWA service worker caches the app shell only — never signed Storage URLs | Accepted |
| [0010](0010-manual-trigger-deploy-workflow.md) | Manual-trigger (`workflow_dispatch`) deploy workflow, not deploy-on-merge | Accepted |
| [0011](0011-dedicated-firebase-project-for-puzzle-module.md) | Migrate the Puzzle Module to its own dedicated Firebase project (`lovedigitally-puzzle`) | Accepted |
