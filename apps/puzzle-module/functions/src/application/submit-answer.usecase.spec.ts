import { submitAnswer } from './submit-answer.usecase';
import { createFakeEventLogStore, createFakeExperienceStore, createFakeLogger, createFakeProgressStore, createFakeStorageService } from './testing/fakes';
import { seedExperience } from './testing/seed-experience';
import {
  AlreadyUnlockedError,
  ExperienceNotFoundError,
  QuestionNotFoundError,
  RateLimitedError,
} from '../domain/errors/domain-errors';

describe('submitAnswer use-case', () => {
  function buildDeps() {
    return {
      experienceStore: createFakeExperienceStore({ exp_test: seedExperience({ status: 'published' }) }),
      progressStore: createFakeProgressStore(),
      eventLogStore: createFakeEventLogStore(),
      storageService: createFakeStorageService(),
      logger: createFakeLogger(),
    };
  }

  it('unlocks the piece on a correct first-try answer — earnedVia direct, full points', async () => {
    const deps = buildDeps();

    const result = await submitAnswer(deps, { experienceId: 'exp_test', questionId: 'q1', answer: 'answer-q1' });

    expect(result.correct).toBeTrue();
    if (result.correct) {
      expect(result.earnedVia).toBe('direct');
      expect(result.pointsAwarded).toBe(100);
      expect(result.feedbackTier).toBe('youre_awesome');
      expect(result.piecesUnlocked).toBe(1);
      expect(result.piecesRemaining).toBe(8);
      expect(result.pieceImageUrl).toContain('slice-q1.jpg');
    }
    expect(deps.eventLogStore.events).toEqual([
      { eventName: 'question.answered_correct', experienceId: 'exp_test', moduleType: 'puzzle', actorRole: 'recipient', payload: { questionId: 'q1', cluesUsed: 0 } },
      { eventName: 'piece.unlocked', experienceId: 'exp_test', moduleType: 'puzzle', actorRole: 'recipient', payload: { questionId: 'q1', earnedVia: 'direct', pointsAwarded: 100 } },
    ]);
  });

  it('accepts a case-insensitive, whitespace-trimmed match', async () => {
    const deps = buildDeps();
    const result = await submitAnswer(deps, { experienceId: 'exp_test', questionId: 'q1', answer: '  ANSWER-q1  ' });
    expect(result.correct).toBeTrue();
  });

  it('accepts a listed accepted variant', async () => {
    const deps = buildDeps();
    const result = await submitAnswer(deps, { experienceId: 'exp_test', questionId: 'q1', answer: 'Answer-q1' });
    expect(result.correct).toBeTrue();
  });

  it('returns clueAvailable + attemptNumber on an incorrect answer, without unlocking anything', async () => {
    const deps = buildDeps();

    const result = await submitAnswer(deps, { experienceId: 'exp_test', questionId: 'q1', answer: 'wrong' });

    expect(result.correct).toBeFalse();
    if (!result.correct) {
      expect(result.attemptNumber).toBe(1);
      expect(result.clueAvailable).toBeTrue();
      expect(result.cluesUsedSoFar).toBe(0);
      expect(result.partnerHelpAvailable).toBeFalse();
    }
    expect(deps.progressStore.docs['exp_test'].pieces['q1'].status).toBe('locked');
    expect(deps.eventLogStore.events).toEqual([
      { eventName: 'question.answered_incorrect', experienceId: 'exp_test', moduleType: 'puzzle', actorRole: 'recipient', payload: { questionId: 'q1', attemptNumber: 1 } },
    ]);
  });

  it('awards reduced points when clues were used before the correct answer', async () => {
    const deps = buildDeps();
    await deps.progressStore.initializeIfAbsent('exp_test');
    await deps.progressStore.recordClueUsed('exp_test', 'q1', 3);
    await deps.progressStore.recordClueUsed('exp_test', 'q1', 3);

    const result = await submitAnswer(deps, { experienceId: 'exp_test', questionId: 'q1', answer: 'answer-q1' });

    expect(result.correct).toBeTrue();
    if (result.correct) {
      expect(result.cluesUsed).toBe(2);
      expect(result.earnedVia).toBe('clue');
      expect(result.pointsAwarded).toBe(50);
      expect(result.feedbackTier).toBe('nudge_to_remember');
    }
  });

  it('marks the experience completed once the 9th piece is unlocked', async () => {
    const deps = buildDeps();
    for (let i = 1; i <= 8; i++) {
      await submitAnswer(deps, { experienceId: 'exp_test', questionId: `q${i}`, answer: `answer-q${i}` });
    }
    expect(deps.progressStore.docs['exp_test'].status).toBe('in_progress');

    await submitAnswer(deps, { experienceId: 'exp_test', questionId: 'q9', answer: 'answer-q9' });

    expect(deps.progressStore.docs['exp_test'].status).toBe('completed');
    expect(deps.progressStore.docs['exp_test'].completedAt).not.toBeNull();

    const completedEvents = deps.eventLogStore.events.filter((e) => e.eventName === 'puzzle.completed');
    expect(completedEvents.length).toBe(1);
    expect(completedEvents[0].payload['finalScore']).toBe(900);
    expect(completedEvents[0].payload['starRating']).toBe(3);
    expect(typeof completedEvents[0].payload['timeToCompleteMs']).toBe('number');
  });

  it('rejects resubmitting an already-unlocked piece', async () => {
    const deps = buildDeps();
    await submitAnswer(deps, { experienceId: 'exp_test', questionId: 'q1', answer: 'answer-q1' });

    await expectAsync(
      submitAnswer(deps, { experienceId: 'exp_test', questionId: 'q1', answer: 'answer-q1' }),
    ).toBeRejectedWith(jasmine.any(AlreadyUnlockedError));
  });

  it('rejects an unknown experience', async () => {
    const deps = buildDeps();
    await expectAsync(
      submitAnswer(deps, { experienceId: 'missing', questionId: 'q1', answer: 'x' }),
    ).toBeRejectedWith(jasmine.any(ExperienceNotFoundError));
  });

  it('rejects an unknown question on a real experience', async () => {
    const deps = buildDeps();
    await expectAsync(
      submitAnswer(deps, { experienceId: 'exp_test', questionId: 'q99', answer: 'x' }),
    ).toBeRejectedWith(jasmine.any(QuestionNotFoundError));
  });

  it('rate-limits repeated wrong attempts on the same question', async () => {
    const deps = buildDeps();
    for (let i = 0; i < 20; i++) {
      await submitAnswer(deps, { experienceId: 'exp_test', questionId: 'q1', answer: 'wrong' });
    }
    await expectAsync(
      submitAnswer(deps, { experienceId: 'exp_test', questionId: 'q1', answer: 'wrong' }),
    ).toBeRejectedWith(jasmine.any(RateLimitedError));
  });
});
