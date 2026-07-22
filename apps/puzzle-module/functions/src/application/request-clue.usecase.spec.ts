import { requestClue } from './request-clue.usecase';
import { createFakeExperienceStore, createFakeLogger, createFakeProgressStore } from './testing/fakes';
import { seedExperience } from './testing/seed-experience';
import { ExperienceNotFoundError, NoCluesRemainingError, QuestionNotFoundError } from '../domain/errors/domain-errors';

describe('requestClue use-case', () => {
  function buildDeps(overrides: Partial<ReturnType<typeof seedExperience>> = {}) {
    return {
      experienceStore: createFakeExperienceStore({ exp_test: seedExperience({ status: 'published', ...overrides }) }),
      progressStore: createFakeProgressStore(),
      logger: createFakeLogger(),
    };
  }

  it('reveals clues in order, 1 -> 2 -> 3', async () => {
    const deps = buildDeps();

    const first = await requestClue(deps, { experienceId: 'exp_test', questionId: 'q1' });
    expect(first.clueNumber).toBe(1);
    expect(first.clueText).toBe('clue1-q1');
    expect(first.clueNumbersRemaining).toBe(2);

    const second = await requestClue(deps, { experienceId: 'exp_test', questionId: 'q1' });
    expect(second.clueNumber).toBe(2);
    expect(second.clueText).toBe('clue2-q1');

    const third = await requestClue(deps, { experienceId: 'exp_test', questionId: 'q1' });
    expect(third.clueNumber).toBe(3);
    expect(third.clueText).toBe('clue3-q1');
    expect(third.clueNumbersRemaining).toBe(0);
  });

  it('rejects a 4th clue request once all 3 are used', async () => {
    const deps = buildDeps();
    await requestClue(deps, { experienceId: 'exp_test', questionId: 'q1' });
    await requestClue(deps, { experienceId: 'exp_test', questionId: 'q1' });
    await requestClue(deps, { experienceId: 'exp_test', questionId: 'q1' });

    await expectAsync(requestClue(deps, { experienceId: 'exp_test', questionId: 'q1' })).toBeRejectedWith(
      jasmine.any(NoCluesRemainingError),
    );
  });

  it('respects a question authored with fewer than 3 clues', async () => {
    const experience = seedExperience({
      status: 'published',
      questions: seedExperience().questions.map((q) =>
        q.questionId === 'q1' ? { ...q, clues: ['only-clue'] } : q,
      ),
    });
    const deps = {
      experienceStore: createFakeExperienceStore({ exp_test: experience }),
      progressStore: createFakeProgressStore(),
      logger: createFakeLogger(),
    };

    const first = await requestClue(deps, { experienceId: 'exp_test', questionId: 'q1' });
    expect(first.clueText).toBe('only-clue');
    expect(first.clueNumbersRemaining).toBe(0);

    await expectAsync(requestClue(deps, { experienceId: 'exp_test', questionId: 'q1' })).toBeRejectedWith(
      jasmine.any(NoCluesRemainingError),
    );
  });

  it('rejects an unknown experience', async () => {
    const deps = buildDeps();
    await expectAsync(requestClue(deps, { experienceId: 'missing', questionId: 'q1' })).toBeRejectedWith(
      jasmine.any(ExperienceNotFoundError),
    );
  });

  it('rejects an unknown question', async () => {
    const deps = buildDeps();
    await expectAsync(requestClue(deps, { experienceId: 'exp_test', questionId: 'q99' })).toBeRejectedWith(
      jasmine.any(QuestionNotFoundError),
    );
  });
});
