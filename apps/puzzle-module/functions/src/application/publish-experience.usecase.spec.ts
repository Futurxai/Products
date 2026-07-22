import { publishExperience } from './publish-experience.usecase';
import { createFakeExperienceStore, createFakeLogger, createFakeTokenService } from './testing/fakes';
import { seedExperience } from './testing/seed-experience';
import { ExperienceNotFoundError, IncompleteExperienceError, UnauthorizedError } from '../domain/errors/domain-errors';

describe('publishExperience use-case', () => {
  function buildDeps(experiences: Record<string, ReturnType<typeof seedExperience>>) {
    return {
      experienceStore: createFakeExperienceStore(experiences),
      tokenService: createFakeTokenService(),
      logger: createFakeLogger(),
    };
  }

  it('publishes a fully-authored experience and returns a share link', async () => {
    const deps = buildDeps({ exp_test: seedExperience() });

    const result = await publishExperience(deps, { experienceId: 'exp_test', requesterUid: 'cre_test' });

    expect(result.shareToken).toContain('pzl_fake_token_');
    expect(result.shareUrl).toContain(result.shareToken);
    expect(deps.experienceStore.experiences['exp_test'].status).toBe('published');
    expect(deps.experienceStore.experiences['exp_test'].shareTokenHash).toBe(deps.tokenService.hashShareToken(result.shareToken));
  });

  it('rejects publishing an experience that does not exist', async () => {
    const deps = buildDeps({});
    await expectAsync(publishExperience(deps, { experienceId: 'missing', requesterUid: 'cre_test' })).toBeRejectedWith(
      jasmine.any(ExperienceNotFoundError),
    );
  });

  it('rejects publishing by anyone other than the owning creator', async () => {
    const deps = buildDeps({ exp_test: seedExperience() });
    await expectAsync(
      publishExperience(deps, { experienceId: 'exp_test', requesterUid: 'someone-else' }),
    ).toBeRejectedWith(jasmine.any(UnauthorizedError));
  });

  it('rejects publishing an incomplete experience, listing every missing field', async () => {
    const deps = buildDeps({ exp_test: seedExperience({ welcomeNote: '', questions: [] }) });

    let caught: unknown;
    try {
      await publishExperience(deps, { experienceId: 'exp_test', requesterUid: 'cre_test' });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(IncompleteExperienceError);
    const error = caught as IncompleteExperienceError;
    expect(error.details?.['missingFields']).toContain('welcomeNote');
    expect(error.details?.['missingFields']).toContain('questions');
  });

  it('never leaves the experience half-published when validation fails', async () => {
    const deps = buildDeps({ exp_test: seedExperience({ welcomeNote: '' }) });
    try {
      await publishExperience(deps, { experienceId: 'exp_test', requesterUid: 'cre_test' });
    } catch {
      // expected
    }
    expect(deps.experienceStore.experiences['exp_test'].status).toBe('draft');
  });
});
