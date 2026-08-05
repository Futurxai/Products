/**
 * Canonical set of business-meaningful failure codes. This is the ONE
 * list — `ports/puzzle-api.port.ts`'s `ApiError` type re-exports it
 * rather than declaring a second, parallel enum that could drift.
 *
 * Codes prefixed conceptually by where they can occur:
 *   - Publish flow:      INCOMPLETE_EXPERIENCE, EXPERIENCE_NOT_FOUND, UNAUTHORIZED
 *   - Token resolution:  TOKEN_NOT_FOUND
 *   - Gameplay:          QUESTION_NOT_FOUND, ALREADY_UNLOCKED, NO_CLUES_REMAINING,
 *                         CLUES_NOT_EXHAUSTED, RATE_LIMITED
 *   - Completion:        NOT_YET_COMPLETED
 *   - Editing:           EXPERIENCE_ALREADY_STARTED
 */
export type DomainErrorCode =
  | 'TOKEN_NOT_FOUND'
  | 'INCOMPLETE_EXPERIENCE'
  | 'NO_CLUES_REMAINING'
  | 'CLUES_NOT_EXHAUSTED'
  | 'NOT_YET_COMPLETED'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'EXPERIENCE_ALREADY_STARTED'
  | 'EXPERIENCE_NOT_FOUND'
  | 'QUESTION_NOT_FOUND'
  | 'ALREADY_UNLOCKED';

/**
 * Base class for every business-rule failure. Deliberately NOT a
 * Firebase/HTTP type — `DomainError` has no idea it will eventually
 * become an `HttpsError` in a Cloud Function or a UI toast in Angular.
 * That mapping is an infrastructure/presentation concern (see
 * `functions/src/callable/*.ts` in M2, and the eventual Angular error
 * interceptor in M3+), kept out of the domain layer on purpose.
 */
export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode;

  protected constructor(message: string, readonly details?: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = new.target.name;
  }
}

export class TokenNotFoundError extends DomainError {
  readonly code = 'TOKEN_NOT_FOUND' as const;
  constructor() {
    super('This link is invalid or has expired.');
  }
}

export class IncompleteExperienceError extends DomainError {
  readonly code = 'INCOMPLETE_EXPERIENCE' as const;
  constructor(missingFields: readonly string[]) {
    super(`Cannot publish: ${missingFields.length} required field(s) are incomplete.`, { missingFields });
  }
}

export class NoCluesRemainingError extends DomainError {
  readonly code = 'NO_CLUES_REMAINING' as const;
  constructor(questionId: string) {
    super(`All 3 clues have already been used for question ${questionId}.`, { questionId });
  }
}

export class CluesNotExhaustedError extends DomainError {
  readonly code = 'CLUES_NOT_EXHAUSTED' as const;
  constructor(questionId: string, cluesUsedSoFar: number) {
    super(`Use all 3 clues before requesting partner help for question ${questionId}.`, {
      questionId,
      cluesUsedSoFar,
    });
  }
}

export class NotYetCompletedError extends DomainError {
  readonly code = 'NOT_YET_COMPLETED' as const;
  constructor(piecesRemaining: number) {
    super(`${piecesRemaining} piece(s) remaining.`, { piecesRemaining });
  }
}

export class RateLimitedError extends DomainError {
  readonly code = 'RATE_LIMITED' as const;
  constructor(questionId: string) {
    super(`Too many attempts for question ${questionId}. Please wait before trying again.`, { questionId });
  }
}

export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED' as const;
  constructor(message = 'You do not have permission to perform this action.') {
    super(message);
  }
}

export class ExperienceAlreadyStartedError extends DomainError {
  readonly code = 'EXPERIENCE_ALREADY_STARTED' as const;
  constructor() {
    super('This experience cannot be edited or unpublished — the recipient has already started playing.');
  }
}

export class ExperienceNotFoundError extends DomainError {
  readonly code = 'EXPERIENCE_NOT_FOUND' as const;
  constructor(experienceId: string) {
    super(`No experience found with id ${experienceId}.`, { experienceId });
  }
}

export class QuestionNotFoundError extends DomainError {
  readonly code = 'QUESTION_NOT_FOUND' as const;
  constructor(questionId: string) {
    super(`No question ${questionId} exists on this experience.`, { questionId });
  }
}

export class AlreadyUnlockedError extends DomainError {
  readonly code = 'ALREADY_UNLOCKED' as const;
  constructor(questionId: string) {
    super(`Question ${questionId} is already unlocked.`, { questionId });
  }
}

/** Type guard so callable handlers can narrow `unknown` catch values without an `instanceof` chain everywhere. */
export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
