/**
 * Runs against REAL local Firestore + Auth emulators (via
 * `firebase emulators:exec`, see ../../scripts and package.json's
 * `test:emulator`) — not the in-memory fakes used by the
 * `*.usecase.spec.ts` unit tests. This is what actually exercises
 * `firestore-experience.store.ts` / `firestore-progress.store.ts`'s
 * real transactions, and the real Auth emulator minting an anonymous
 * user with a custom claim.
 *
 * Scope boundary, deliberately: this calls the exported callable
 * handlers directly via `firebase-functions-test`'s `wrap()`, with a
 * manually-constructed `auth` context for the recipient-scoped calls
 * (`{ uid, token: { experienceId } }`) rather than performing a real
 * client-side `signInWithCustomToken` exchange against the Auth
 * emulator. That exchange is Firebase's own SDK code, not this
 * project's; what's under test here is everything server-side of it —
 * and the constructed auth context is exactly what Firebase would
 * populate `request.auth` with after a real exchange, since it's
 * built from the same custom claims `auth.service.ts` actually sets
 * via the emulator.
 */
import testEnvFactory from 'firebase-functions-test';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

process.env['GCLOUD_PROJECT'] = process.env['GCLOUD_PROJECT'] ?? 'lovedigitally-app';

const test = testEnvFactory({ projectId: 'lovedigitally-app' });
// storageBucket set explicitly — `buildDependencies()` constructs a
// Storage client for every callable regardless of whether that
// specific use-case touches it, so it must resolve even here, backed
// by the Storage emulator started alongside firestore/auth for this
// test run (see package.json's test:emulator script).
initializeApp({ projectId: 'lovedigitally-app', storageBucket: 'lovedigitally-app.appspot.com' });

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { publishExperienceCallable } = require('../callable/publish-experience.callable');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolveShareTokenCallable } = require('../callable/resolve-share-token.callable');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { submitAnswerCallable } = require('../callable/submit-answer.callable');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { requestClueCallable } = require('../callable/request-clue.callable');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { requestPartnerHelpRevealCallable } = require('../callable/request-partner-help-reveal.callable');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getCompletionSummaryCallable } = require('../callable/get-completion-summary.callable');

const publishExperience = test.wrap(publishExperienceCallable);
const resolveShareToken = test.wrap(resolveShareTokenCallable);
const submitAnswer = test.wrap(submitAnswerCallable);
const requestClue = test.wrap(requestClueCallable);
const requestPartnerHelpReveal = test.wrap(requestPartnerHelpRevealCallable);
const getCompletionSummary = test.wrap(getCompletionSummaryCallable);

const EXPERIENCE_ID = 'emu_exp_1';
const CREATOR_UID = 'emu_creator_1';

async function seedDraftExperience(): Promise<void> {
  const db = getFirestore();

  const questions = Array.from({ length: 9 }, (_, i) => ({
    questionId: `q${i + 1}`,
    correctAnswer: `answer-${i + 1}`,
    acceptedVariants: [],
    clues: [`clue1-${i + 1}`, `clue2-${i + 1}`, `clue3-${i + 1}`],
  }));

  await db.collection('puzzle_experiences').doc(EXPERIENCE_ID).set({
    creatorId: CREATOR_UID,
    occasion: 'Anniversary',
    emotion: 'Love',
    recipientDisplayName: 'Emulator Test Recipient',
    status: 'draft',
    welcomeNote: 'Welcome!',
    lockedPatternImagePath: 'puzzle_storage/_shared/patterns/frame-outline.svg',
    questionPrompts: questions.map((q) => `Prompt for ${q.questionId}`),
    createdAt: new Date(),
    publishedAt: null,
    completedAt: null,
    archivedAt: null,
  });

  await db.collection('puzzle_experiences_private').doc(EXPERIENCE_ID).set({
    completionMessage: 'You did it!',
    partnerHelpChallenge: 'Buy me ice cream',
    revealImagePath: `puzzle_storage/${CREATOR_UID}/${EXPERIENCE_ID}/reveal-image.jpg`,
    questions: questions.map((q, i) => ({
      questionId: q.questionId,
      prompt: `Prompt for ${q.questionId}`,
      correctAnswer: q.correctAnswer,
      acceptedVariants: q.acceptedVariants,
      clues: i === 8 ? [] : q.clues, // q9 authored with zero clues on purpose — exercises that edge case for real
    })),
  });
}

describe('Puzzle Module gameplay flow (Firestore + Auth emulators)', () => {
  let shareToken: string;
  let experienceId: string;
  let recipientAuth: { uid: string; token: Record<string, unknown> };

  beforeAll(async () => {
    await seedDraftExperience();
  });

  afterAll(() => {
    test.cleanup();
  });

  it('publishes the seeded draft as its owning creator', async () => {
    const result = await publishExperience({
      data: { experienceId: EXPERIENCE_ID },
      auth: { uid: CREATOR_UID, token: {} },
    });

    expect(result.ok).toBeTrue();
    expect(result.shareToken).toContain('pzl_');
    shareToken = result.shareToken;

    const doc = await getFirestore().collection('puzzle_experiences').doc(EXPERIENCE_ID).get();
    expect(doc.data()?.['status']).toBe('published');
  });

  it('rejects publishing again by a different, non-owning user', async () => {
    const result = await publishExperience({
      data: { experienceId: EXPERIENCE_ID },
      auth: { uid: 'someone-else', token: {} },
    });
    expect(result).toEqual(jasmine.objectContaining({ ok: false, error: 'UNAUTHORIZED' }));
  });

  it('resolves the published share token into a real anonymous Auth session', async () => {
    const result = await resolveShareToken({ data: { shareToken } });

    expect(result.ok).toBeTrue();
    expect(result.experienceId).toBe(EXPERIENCE_ID);
    expect(result.customToken).toBeTruthy();
    expect(result.publicMeta.occasion).toBe('Anniversary');

    // Confirm the Auth emulator actually created the user with the claim
    // set — not just that the use-case returned a plausible-looking value.
    const decoded = await getAuth().verifyIdToken(await exchangeForIdToken(result.customToken));
    expect(decoded['experienceId']).toBe(EXPERIENCE_ID);

    experienceId = result.experienceId;
    recipientAuth = { uid: decoded.uid, token: { experienceId: decoded['experienceId'] } };
  });

  it('rejects an unrecognized share token', async () => {
    const result = await resolveShareToken({ data: { shareToken: 'pzl_totally_made_up' } });
    expect(result).toEqual(jasmine.objectContaining({ ok: false, error: 'TOKEN_NOT_FOUND' }));
  });

  it('creates the progress document lazily on the first real answer submission', async () => {
    const progressBefore = await getFirestore().collection('puzzle_progress').doc(experienceId).get();
    expect(progressBefore.exists).toBeFalse();

    const result = await submitAnswer({
      data: { questionIndex: 'q1', answer: 'answer-1' },
      auth: recipientAuth,
    });

    expect(result).toEqual(jasmine.objectContaining({ ok: true, correct: true, earnedVia: 'direct', pointsAwarded: 100 }));

    const progressAfter = await getFirestore().collection('puzzle_progress').doc(experienceId).get();
    expect(progressAfter.exists).toBeTrue();
    expect(progressAfter.data()?.['pieces']?.['q1']?.['status']).toBe('unlocked');
  });

  it('reveals a real clue from the seeded content and lets a clue-assisted answer through at reduced points', async () => {
    const clue = await requestClue({ data: { questionIndex: 'q2' }, auth: recipientAuth });
    expect(clue).toEqual(jasmine.objectContaining({ ok: true, clueNumber: 1, clueText: 'clue1-2' }));

    const answer = await submitAnswer({ data: { questionIndex: 'q2', answer: 'answer-2' }, auth: recipientAuth });
    expect(answer).toEqual(jasmine.objectContaining({ ok: true, correct: true, earnedVia: 'clue', cluesUsed: 1, pointsAwarded: 75 }));
  });

  it('walks q3 through partner-help after exhausting its clues', async () => {
    await requestClue({ data: { questionIndex: 'q3' }, auth: recipientAuth });
    await requestClue({ data: { questionIndex: 'q3' }, auth: recipientAuth });
    await requestClue({ data: { questionIndex: 'q3' }, auth: recipientAuth });

    const premature = await requestPartnerHelpReveal({ data: { questionIndex: 'q3' }, auth: recipientAuth });
    // Already exhausted, so this should actually succeed now — verify the
    // guard rejects a question that ISN'T exhausted instead, using q4.
    expect(premature).toEqual(jasmine.objectContaining({ ok: true, earnedVia: 'partner_help', pointsAwarded: 10 }));

    const tooEarly = await requestPartnerHelpReveal({ data: { questionIndex: 'q4' }, auth: recipientAuth });
    expect(tooEarly).toEqual(jasmine.objectContaining({ ok: false, error: 'CLUES_NOT_EXHAUSTED' }));
  });

  it('handles a question authored with zero clues — partner-help available immediately', async () => {
    // q9 was seeded with clues: [] — canRequestPartnerHelp must unlock
    // immediately since there was never a clue to exhaust in the first place.
    const result = await requestPartnerHelpReveal({ data: { questionIndex: 'q9' }, auth: recipientAuth });
    expect(result).toEqual(jasmine.objectContaining({ ok: true, earnedVia: 'partner_help' }));
  });

  it('rejects getCompletionSummary before all 9 pieces are unlocked', async () => {
    const result = await getCompletionSummary({ data: {}, auth: recipientAuth });
    expect(result).toEqual(jasmine.objectContaining({ ok: false, error: 'NOT_YET_COMPLETED' }));
  });

  it('finishes the remaining pieces and returns a real completion summary', async () => {
    for (const q of ['q4', 'q5', 'q6', 'q7', 'q8']) {
      const result = await submitAnswer({
        data: { questionIndex: q, answer: `answer-${q.slice(1)}` },
        auth: recipientAuth,
      });
      expect((result as { ok: boolean }).ok).toBeTrue();
    }

    const summary = await getCompletionSummary({ data: {}, auth: recipientAuth });
    expect(summary.ok).toBeTrue();
    expect(summary.maxScore).toBe(900);
    expect(summary.starRating).toBeGreaterThanOrEqual(1);
    expect(summary.perQuestionBreakdown.length).toBe(9);

    const progressDoc = await getFirestore().collection('puzzle_progress').doc(experienceId).get();
    expect(progressDoc.data()?.['status']).toBe('completed');
  });

  it('rejects a stale recipient session (wrong experienceId claim) on a fresh call', async () => {
    const result = await submitAnswer({
      data: { questionIndex: 'q1', answer: 'answer-1' },
      auth: { uid: 'some-other-anon-uid', token: { experienceId: 'a-different-experience' } },
    });
    expect(result).toEqual(jasmine.objectContaining({ ok: false, error: 'EXPERIENCE_NOT_FOUND' }));
  });
});

/**
 * Exchanges a custom token for a real ID token via the Auth emulator's
 * REST API — the one piece of "real client flow" reproduced here,
 * specifically to prove `createExperienceSession`'s custom claim
 * actually survives the exchange (Admin SDK alone can't verify that;
 * `verifyIdToken` needs a real ID token, not the custom token).
 */
async function exchangeForIdToken(customToken: string): Promise<string> {
  const authEmulatorHost = process.env['FIREBASE_AUTH_EMULATOR_HOST'];
  if (!authEmulatorHost) {
    throw new Error('FIREBASE_AUTH_EMULATOR_HOST is not set — this test must run under `firebase emulators:exec`.');
  }
  const apiKey = 'fake-api-key'; // the Auth emulator does not validate this
  const url = `http://${authEmulatorHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  if (!response.ok) {
    throw new Error(`Auth emulator custom-token exchange failed: ${response.status} ${await response.text()}`);
  }
  const body = (await response.json()) as { idToken: string };
  return body.idToken;
}
