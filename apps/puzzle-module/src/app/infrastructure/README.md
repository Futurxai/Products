# infrastructure/

Firebase-specific adapters. This is the **only** layer allowed to import `firebase/*` or `@angular/fire/*` (everywhere else it's an ESLint error).

- `firebase/auth.service.ts` — implements `AuthPort` against `@angular/fire/auth`; the only place a raw Firebase `User` or `FirebaseError` is ever seen, translating both into `AuthUser`/`AuthError` before they leave this file.
- `firebase/firestore-creator.repository.ts` — implements `CreatorRepositoryPort` against `puzzle_creators`.
- `firebase/firestore-experience.repository.ts` — implements `ExperienceRepositoryPort` against `puzzle_experiences` (public) / `puzzle_experiences_private` (owner-only), splitting and merging every `PuzzleExperience` the same way `functions/src/infrastructure/firestore-experience.store.ts` (M2) does via the Admin SDK — one agreed-on schema, two independent implementations. `update()` only ever touches Wizard-editable fields; `status`/`publishedAt`/`completedAt`/`archivedAt`/`shareTokenHash` transitions are Cloud-Function-only, both by convention here and by Firestore Rules.
- `firebase/firestore-progress.repository.ts` — implements `ProgressRepositoryPort` against `puzzle_progress`.
- `firebase/storage.service.ts` — reveal image upload + signed URL retrieval against the `puzzle_storage/` prefix.
- `firebase/functions-puzzle-api.service.ts` — implements `PuzzleApiPort` by calling the six callable Cloud Functions (`publishExperience`, `resolveShareToken`, `submitAnswer`, `requestClue`, `requestPartnerHelpReveal`, `getCompletionSummary`).
- `firebase/firebase-analytics.sink.ts` — implements the Module Contract's analytics sink interface against Firebase Analytics.

If this module is later embedded in a different host, this is the folder that changes — `domain/` and `application/` should not need to know.

Added starting Milestone M2 (Cloud Functions client), extended in M3 (Creator auth).
