# domain/

The innermost Clean Architecture layer. **No Angular imports, no Firebase imports, no framework of any kind.** Pure TypeScript only — this is what makes the scoring/lifecycle rules trivially unit-testable and portable if the module is ever embedded in a different host platform.

- `models/` — plain interfaces/types: `PuzzleExperience`, `Question`, `Progress`, `Score`. Data shapes, no behavior.
- `rules/` — pure functions only: `computeScore()`, `starRatingFor()`, `canEdit()`, `canPublish()`. Given the same input, always the same output. No side effects, no I/O.
- `ports/` — interfaces the domain/application layers depend on (`ExperienceRepositoryPort`, `ProgressRepositoryPort`, `PuzzleApiPort`). `infrastructure/` implements these; `domain/` and `application/` never know or care that the implementation happens to be Firebase.

Enforced by the `no-restricted-imports` ESLint rule in `.eslintrc.json` — importing `firebase/*` or `@angular/fire/*` anywhere under this folder is a lint error, not just a convention.

Added starting Milestone M1.
