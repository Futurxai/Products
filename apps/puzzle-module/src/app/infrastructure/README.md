# infrastructure/

Firebase-specific adapters. This is the **only** layer allowed to import `firebase/*` or `@angular/fire/*` (everywhere else it's an ESLint error).

- `firebase/auth.service.ts` — implements `AuthPort` against `@angular/fire/auth`; the only place a raw Firebase `User` or `FirebaseError` is ever seen, translating both into `AuthUser`/`AuthError` before they leave this file.
- `firebase/firestore-creator.repository.ts` — implements `CreatorRepositoryPort` against `puzzle_creators`.
- `firebase/firestore-experience.repository.ts` — implements `ExperienceRepositoryPort` against `puzzle_experiences` (public) / `puzzle_experiences_private` (owner-only), splitting and merging every `PuzzleExperience` the same way `functions/src/infrastructure/firestore-experience.store.ts` (M2) does via the Admin SDK — one agreed-on schema, two independent implementations. `update()` only ever touches Wizard-editable fields; `status`/`publishedAt`/`completedAt`/`archivedAt`/`shareTokenHash` transitions are Cloud-Function-only, both by convention here and by Firestore Rules.
- `firebase/firestore-progress.repository.ts` — implements `ProgressRepositoryPort` against `puzzle_progress`.
- `firebase/storage-upload.service.ts` — implements `StorageUploadPort`; the Wizard's only way to write `puzzle_storage/{creatorId}/{experienceId}/reveal-image-original.{ext}`. Re-validates size/content-type client-side (mirroring Storage Rules) before ever calling `uploadBytes`. Also reads that same object back as a `Blob` (`getRevealImageOriginalBlob`, M3 Feature 4) for the Puzzle Preview board — Storage Rules grant the creator read access to their own original upload, nothing else.
- `firebase/storage.service.ts` — reveal image upload + signed URL retrieval against the `puzzle_storage/` prefix.
- `firebase/functions-puzzle-api.service.ts` (M3 Feature 5) — implements `PuzzleApiPort` by calling the six callable Cloud Functions (`publishExperience`, `resolveShareToken`, `submitAnswer`, `requestClue`, `requestPartnerHelpReveal`, `getCompletionSummary`), all in `asia-south1` — the region every callable actually deploys to (`functions/src/callable/define-callable.ts`), which `app.config.ts`'s `provideFunctions()` must request explicitly or `httpsCallable` resolves against a nonexistent `us-central1` deployment. Every method maps the raw wire response into the port's declared shape field-by-field rather than casting — the gameplay callables' own usecases use `questionId` internally, while this port's client-facing types use `questionIndex` (the Phase 3 API contract's name), a deliberate difference a blind cast would silently get wrong. Only `publishExperience` is exercised by any feature built so far; the other five are implemented and unit-tested in full, ready for `application/recipient/puzzle-session.facade.ts` (M5).
- `firebase/firebase-analytics.sink.ts` — implements the Module Contract's analytics sink interface against Firebase Analytics.

If this module is later embedded in a different host, this is the folder that changes — `domain/` and `application/` should not need to know.

Added starting Milestone M2 (Cloud Functions client), extended in M3 (Creator auth).
