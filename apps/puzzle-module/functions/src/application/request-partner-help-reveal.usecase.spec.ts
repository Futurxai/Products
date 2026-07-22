import { requestPartnerHelpReveal } from './request-partner-help-reveal.usecase';
import { createFakeExperienceStore, createFakeLogger, createFakeProgressStore, createFakeStorageService } from './testing/fakes';
import { seedExperience } from './testing/seed-experience';
import { CluesNotExhaustedError } from '../domain/errors/domain-errors';

describe('requestPartnerHelpReveal use-case', () => {
  function buildDeps() {
    return {
      experienceStore: createFakeExperienceStore({ exp_test: seedExperience({ status: 'published' }) }),
      progressStore: createFakeProgressStore(),
      storageService: createFakeStorageService(),
      logger: createFakeLogger(),
    };
  }

  it('rejects a request before all 3 clues are exhausted', async () => {
    const deps = buildDeps();
    await deps.progressStore.initializeIfAbsent('exp_test');
    await deps.progressStore.recordClueUsed('exp_test', 'q1', 3);

    await expectAsync(requestPartnerHelpReveal(deps, { experienceId: 'exp_test', questionId: 'q1' })).toBeRejectedWith(
      jasmine.any(CluesNotExhaustedError),
    );
  });

  it('unlocks the piece at the partner-help point tier once all 3 clues are used', async () => {
    const deps = buildDeps();
    await deps.progressStore.initializeIfAbsent('exp_test');
    await deps.progressStore.recordClueUsed('exp_test', 'q1', 3);
    await deps.progressStore.recordClueUsed('exp_test', 'q1', 3);
    await deps.progressStore.recordClueUsed('exp_test', 'q1', 3);

    const result = await requestPartnerHelpReveal(deps, { experienceId: 'exp_test', questionId: 'q1' });

    expect(result.earnedVia).toBe('partner_help');
    expect(result.pointsAwarded).toBe(10);
    expect(result.feedbackTier).toBe('teasing_inside_jokes');
    expect(deps.progressStore.docs['exp_test'].pieces['q1'].status).toBe('unlocked');
  });

  it('respects a question with fewer than 3 authored clues — unlocks after just those', async () => {
    const experience = seedExperience({
      status: 'published',
      questions: seedExperience().questions.map((q) => (q.questionId === 'q1' ? { ...q, clues: ['only-clue'] } : q)),
    });
    const deps = {
      experienceStore: createFakeExperienceStore({ exp_test: experience }),
      progressStore: createFakeProgressStore(),
      storageService: createFakeStorageService(),
      logger: createFakeLogger(),
    };
    await deps.progressStore.initializeIfAbsent('exp_test');
    await deps.progressStore.recordClueUsed('exp_test', 'q1', 1);

    const result = await requestPartnerHelpReveal(deps, { experienceId: 'exp_test', questionId: 'q1' });
    expect(result.earnedVia).toBe('partner_help');
  });
});
