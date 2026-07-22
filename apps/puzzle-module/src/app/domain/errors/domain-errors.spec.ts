import {
  AlreadyUnlockedError,
  CluesNotExhaustedError,
  DomainError,
  ExperienceAlreadyStartedError,
  ExperienceNotFoundError,
  IncompleteExperienceError,
  isDomainError,
  NoCluesRemainingError,
  NotYetCompletedError,
  QuestionNotFoundError,
  RateLimitedError,
  TokenNotFoundError,
  UnauthorizedError,
} from './domain-errors';

describe('domain errors', () => {
  it('each error carries its own typed code and is a real Error instance', () => {
    const cases: Array<[DomainError, string]> = [
      [new TokenNotFoundError(), 'TOKEN_NOT_FOUND'],
      [new IncompleteExperienceError(['welcomeNote']), 'INCOMPLETE_EXPERIENCE'],
      [new NoCluesRemainingError('q5'), 'NO_CLUES_REMAINING'],
      [new CluesNotExhaustedError('q5', 1), 'CLUES_NOT_EXHAUSTED'],
      [new NotYetCompletedError(4), 'NOT_YET_COMPLETED'],
      [new RateLimitedError('q3'), 'RATE_LIMITED'],
      [new UnauthorizedError(), 'UNAUTHORIZED'],
      [new ExperienceAlreadyStartedError(), 'EXPERIENCE_ALREADY_STARTED'],
      [new ExperienceNotFoundError('exp_missing'), 'EXPERIENCE_NOT_FOUND'],
      [new QuestionNotFoundError('q99'), 'QUESTION_NOT_FOUND'],
      [new AlreadyUnlockedError('q1'), 'ALREADY_UNLOCKED'],
    ];

    for (const [error, expectedCode] of cases) {
      expect(error instanceof Error).toBeTrue();
      expect(error instanceof DomainError).toBeTrue();
      expect(error.code).toBe(expectedCode as never);
      expect(error.name).toBe(error.constructor.name);
      expect(error.message.length).toBeGreaterThan(0);
    }
  });

  it('attaches structured details useful for logging and client display', () => {
    const error = new IncompleteExperienceError(['welcomeNote', 'revealImage']);
    expect(error.details?.['missingFields']).toEqual(['welcomeNote', 'revealImage']);

    const clueError = new CluesNotExhaustedError('q5', 2);
    expect(clueError.details?.['questionId']).toBe('q5');
    expect(clueError.details?.['cluesUsedSoFar']).toBe(2);
  });

  describe('isDomainError', () => {
    it('narrows a DomainError instance', () => {
      const err: unknown = new TokenNotFoundError();
      expect(isDomainError(err)).toBeTrue();
      if (isDomainError(err)) {
        expect(err.code).toBe('TOKEN_NOT_FOUND');
      }
    });

    it('rejects a plain Error or arbitrary value', () => {
      expect(isDomainError(new Error('generic'))).toBeFalse();
      expect(isDomainError('not an error')).toBeFalse();
      expect(isDomainError(null)).toBeFalse();
      expect(isDomainError(undefined)).toBeFalse();
    });
  });
});
