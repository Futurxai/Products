# infrastructure/

Firebase-specific adapters. This is the **only** layer allowed to import `firebase/*` or `@angular/fire/*` (everywhere else it's an ESLint error).

- `firebase/firestore-experience.repository.ts` — implements `ExperienceRepositoryPort` against `puzzle_experiences` / `puzzle_experiences_private`.
- `firebase/firestore-progress.repository.ts` — implements `ProgressRepositoryPort` against `puzzle_progress`.
- `firebase/storage.service.ts` — reveal image upload + signed URL retrieval against the `puzzle_storage/` prefix.
- `firebase/functions-puzzle-api.service.ts` — implements `PuzzleApiPort` by calling the six callable Cloud Functions (`publishExperience`, `resolveShareToken`, `submitAnswer`, `requestClue`, `requestPartnerHelpReveal`, `getCompletionSummary`).
- `firebase/firebase-analytics.sink.ts` — implements the Module Contract's analytics sink interface against Firebase Analytics.

If this module is later embedded in a different host, this is the folder that changes — `domain/` and `application/` should not need to know.

Added starting Milestone M2.
