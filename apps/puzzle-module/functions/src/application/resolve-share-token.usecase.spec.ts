import { resolveShareToken } from './resolve-share-token.usecase';
import {
  createFakeAuthService,
  createFakeExperienceStore,
  createFakeLogger,
  createFakeProgressStore,
  createFakeStorageService,
  createFakeTokenService,
} from './testing/fakes';
import { seedExperience } from './testing/seed-experience';
import { TokenNotFoundError } from '../domain/errors/domain-errors';

describe('resolveShareToken use-case', () => {
  /**
   * The fake experience store indexes shareTokenHash -> experienceId
   * only from what's passed to its constructor (mirroring how the real
   * Firestore store's `findExperienceIdByShareTokenHash` query only
   * ever sees committed documents) — so the published, token-bearing
   * experience must be part of the seed, not assigned onto
   * `.experiences` after construction.
   */
  function buildDeps() {
    const tokenService = createFakeTokenService();
    const rawToken = tokenService.generateShareToken();
    const shareTokenHash = tokenService.hashShareToken(rawToken);

    return {
      rawToken,
      deps: {
        experienceStore: createFakeExperienceStore({
          exp_test: seedExperience({ status: 'published', shareTokenHash }),
        }),
        progressStore: createFakeProgressStore(),
        tokenService,
        authService: createFakeAuthService(),
        storageService: createFakeStorageService(),
        logger: createFakeLogger(),
      },
    };
  }

  it('resolves a valid token to its experience and mints an anonymous session', async () => {
    const { rawToken, deps } = buildDeps();

    const result = await resolveShareToken(deps, { shareToken: rawToken });

    expect(result.experienceId).toBe('exp_test');
    expect(result.customToken).toContain('fake-custom-token-exp_test');
    expect(result.publicMeta.occasion).toBe('Anniversary');
    expect(result.publicMeta.welcomeNote).toBe('Welcome!');
    expect(result.publicMeta.lockedPatternImageUrl).toContain('frame-outline.svg');
    expect(result.publicMeta.partnerHelpChallenge).toBe('Buy me ice cream');
  });

  it('returns an empty unlockedPieceImages map on a first visit (no progress document yet)', async () => {
    const { rawToken, deps } = buildDeps();

    const result = await resolveShareToken(deps, { shareToken: rawToken });

    expect(result.unlockedPieceImages).toEqual({});
  });

  it('re-signs image URLs for pieces already unlocked in an existing progress document', async () => {
    const { rawToken, deps } = buildDeps();
    await deps.progressStore.initializeIfAbsent('exp_test');
    await deps.progressStore.resolvePiece({ experienceId: 'exp_test', questionId: 'q2', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 });

    const result = await resolveShareToken(deps, { shareToken: rawToken });

    expect(Object.keys(result.unlockedPieceImages)).toEqual(['q2']);
    expect(result.unlockedPieceImages['q2']).toContain('slice-q2.jpg');
  });

  it('includes a prompt-only projection of all 9 questions', async () => {
    const { rawToken, deps } = buildDeps();

    const result = await resolveShareToken(deps, { shareToken: rawToken });

    expect(result.publicMeta.questions.length).toBe(9);
    expect(result.publicMeta.questions[0]).toEqual({ questionId: 'q1', prompt: 'Prompt for q1' });
  });

  it('never exposes correct answers, clues, or the reveal image path in publicMeta', async () => {
    const { rawToken, deps } = buildDeps();

    const result = await resolveShareToken(deps, { shareToken: rawToken });

    const serialized = JSON.stringify(result.publicMeta);
    expect(serialized).not.toContain('answer-q1');
    expect(serialized).not.toContain('clue1-q1');
    expect(serialized).not.toContain('reveal-image.jpg');
  });

  it('rejects an unrecognized token', async () => {
    const { deps } = buildDeps();
    await expectAsync(resolveShareToken(deps, { shareToken: 'pzl_never_issued' })).toBeRejectedWith(
      jasmine.any(TokenNotFoundError),
    );
  });
});
