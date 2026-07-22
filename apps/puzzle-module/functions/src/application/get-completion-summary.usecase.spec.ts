import { getCompletionSummary } from './get-completion-summary.usecase';
import { createFakeExperienceStore, createFakeLogger, createFakeProgressStore, createFakeStorageService } from './testing/fakes';
import { seedExperience } from './testing/seed-experience';
import { submitAnswer } from './submit-answer.usecase';
import { ExperienceNotFoundError, NotYetCompletedError } from '../domain/errors/domain-errors';
import { QUESTION_IDS } from '../domain/models/constants';

describe('getCompletionSummary use-case', () => {
  function buildDeps() {
    return {
      experienceStore: createFakeExperienceStore({ exp_test: seedExperience({ status: 'published' }) }),
      progressStore: createFakeProgressStore(),
      storageService: createFakeStorageService(),
      logger: createFakeLogger(),
    };
  }

  it('rejects a request before all 9 pieces are unlocked', async () => {
    const deps = buildDeps();
    await deps.progressStore.initializeIfAbsent('exp_test');

    await expectAsync(getCompletionSummary(deps, { experienceId: 'exp_test' })).toBeRejectedWith(
      jasmine.any(NotYetCompletedError),
    );
  });

  it('returns the full summary once all 9 pieces are unlocked', async () => {
    const deps = buildDeps();
    for (const questionId of QUESTION_IDS) {
      await submitAnswer(
        { experienceStore: deps.experienceStore, progressStore: deps.progressStore, storageService: deps.storageService, logger: deps.logger },
        { experienceId: 'exp_test', questionId, answer: `answer-${questionId}` },
      );
    }

    const summary = await getCompletionSummary(deps, { experienceId: 'exp_test' });

    expect(summary.finalScore).toBe(900);
    expect(summary.maxScore).toBe(900);
    expect(summary.starRating).toBe(3);
    expect(summary.starLabel).toBe('You know them by heart');
    expect(summary.completionMessage).toBe('You did it!');
    expect(summary.finalRevealImageUrl).toContain('full.jpg');
    expect(summary.perQuestionBreakdown.length).toBe(9);
  });

  it('rejects an unknown experience', async () => {
    const deps = buildDeps();
    await expectAsync(getCompletionSummary(deps, { experienceId: 'missing' })).toBeRejectedWith(
      jasmine.any(ExperienceNotFoundError),
    );
  });
});
