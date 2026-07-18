# Puzzle Module — App Context

What it does: Personalized 3×3 photo-jigsaw gifting experience — a Creator authors 9 memory-based questions gating a reveal image; a Recipient plays through a shared link with no account required.
Target user: Couples, friends, and family in India personalizing a digital gift for an occasion (anniversary, birthday, proposal, wedding, friendship, baby, graduation, long distance, family).
Key features: Creator authoring wizard, secure token-based recipient links, clue system with WhatsApp partner-help fallback, server-validated scoring, PWA-first.
Firebase project: `lovedigitally-app` (shared with `/lovedigitally-web` — isolated via the `puzzle_*` Firestore/Storage namespace and a dedicated `puzzle-module` Hosting site + Functions codebase, not a separate project).
Architecture: Clean Architecture — `domain/` (framework-free models & rules) → `application/` (use-cases & signal facades) → `infrastructure/` (Firebase adapters) → `features/` (Ionic Angular standalone pages). See `docs/puzzle-module/` at the repo root for the full PRD, Module Contract, and architecture spec this app is built against.
Current phase: Milestone M0 — Environment & Infrastructure Setup.

App-specific rules:
- `domain/`, `application/`, `features/`, `shared/` must never import `firebase/*` or `@angular/fire/*` directly — only `infrastructure/firebase/*` may (enforced by ESLint, see `.eslintrc.json`).
- Correct answers, clue text, and the full-resolution reveal image are never sent to the client before earned — always validated server-side via Cloud Functions, never trust the client (Module Contract §8).
- The Recipient never sees a login screen — Firebase Anonymous Auth is minted silently by `resolveShareToken`, scoped to one experience via a custom claim.
- `firestore.rules` and `storage.rules` are NOT owned by this app — they live in `../../lovedigitally-web/` and are shared across both apps in the same Firebase project. Never deploy rules from here without confirming the shared file is up to date; see the README for the coordination process.
