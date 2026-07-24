import { TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { Progress } from '@domain/models/progress.model';
import {
  CompletionSummaryResult,
  PublishExperienceResult,
  PuzzleApiPort,
  RequestClueResult,
  RequestPartnerHelpRevealResult,
  ResolveShareTokenResult,
  SubmitAnswerResult,
} from '@domain/ports/puzzle-api.port';
import { ProgressRepositoryPort } from '@domain/ports/progress-repository.port';
import { RecipientSessionPort } from '@domain/ports/recipient-session.port';

import { PUZZLE_API_PORT } from '../creator/publish.tokens';
import { PROGRESS_REPOSITORY_PORT, RECIPIENT_SESSION_PORT } from './recipient.tokens';
import { PuzzleSessionFacade } from './puzzle-session.facade';

const SUCCESS: ResolveShareTokenResult = {
  ok: true,
  experienceId: 'exp_1',
  customToken: 'tok_abc',
  publicMeta: {
    occasion: 'Anniversary',
    emotion: 'Love',
    recipientDisplayName: 'Ananya',
    welcomeNote: 'Hi!',
    status: 'published',
    lockedPatternImageUrl: 'https://x/pattern.svg',
    questions: [{ questionId: 'q1', prompt: 'Where did we meet?' }],
    partnerHelpChallenge: 'Ask them nicely',
  },
  unlockedPieceImages: {},
};

class FakePuzzleApiPort implements PuzzleApiPort {
  resolveShareTokenResult: ResolveShareTokenResult | (() => Promise<ResolveShareTokenResult>) = SUCCESS;
  submitAnswerResult: SubmitAnswerResult | (() => Promise<SubmitAnswerResult>) = { ok: false, error: 'QUESTION_NOT_FOUND', message: 'not configured' };
  submitAnswerCalls: Array<{ questionIndex: string; answer: string }> = [];
  requestClueResult: RequestClueResult | (() => Promise<RequestClueResult>) = { ok: false, error: 'QUESTION_NOT_FOUND', message: 'not configured' };
  requestClueCalls: string[] = [];
  requestPartnerHelpRevealResult: RequestPartnerHelpRevealResult | (() => Promise<RequestPartnerHelpRevealResult>) = {
    ok: false,
    error: 'QUESTION_NOT_FOUND',
    message: 'not configured',
  };
  requestPartnerHelpRevealCalls: string[] = [];

  async resolveShareToken(): Promise<ResolveShareTokenResult> {
    return typeof this.resolveShareTokenResult === 'function' ? this.resolveShareTokenResult() : this.resolveShareTokenResult;
  }
  async publishExperience(): Promise<PublishExperienceResult> {
    throw new Error('not used');
  }
  async submitAnswer(questionIndex: string, answer: string): Promise<SubmitAnswerResult> {
    this.submitAnswerCalls.push({ questionIndex, answer });
    return typeof this.submitAnswerResult === 'function' ? this.submitAnswerResult() : this.submitAnswerResult;
  }
  async requestClue(questionIndex: string): Promise<RequestClueResult> {
    this.requestClueCalls.push(questionIndex);
    return typeof this.requestClueResult === 'function' ? this.requestClueResult() : this.requestClueResult;
  }
  async requestPartnerHelpReveal(questionIndex: string): Promise<RequestPartnerHelpRevealResult> {
    this.requestPartnerHelpRevealCalls.push(questionIndex);
    return typeof this.requestPartnerHelpRevealResult === 'function' ? this.requestPartnerHelpRevealResult() : this.requestPartnerHelpRevealResult;
  }
  getCompletionSummaryResult: CompletionSummaryResult | (() => Promise<CompletionSummaryResult>) = {
    ok: false,
    error: 'NOT_YET_COMPLETED',
    message: 'not configured',
  };
  getCompletionSummaryCalls = 0;

  async getCompletionSummary(): Promise<CompletionSummaryResult> {
    this.getCompletionSummaryCalls += 1;
    return typeof this.getCompletionSummaryResult === 'function' ? this.getCompletionSummaryResult() : this.getCompletionSummaryResult;
  }
}

class FakeRecipientSessionPort implements RecipientSessionPort {
  signInShouldFail = false;
  signedInWith: string | null = null;

  async signInWithCustomToken(customToken: string): Promise<void> {
    if (this.signInShouldFail) {
      throw new Error('auth/invalid-custom-token');
    }
    this.signedInWith = customToken;
  }
}

class FakeProgressRepository implements ProgressRepositoryPort {
  subjects = new Map<string, Subject<Progress | null>>();
  unsubscribedExperienceIds: string[] = [];

  async getByExperienceId(): Promise<Progress | null> {
    return null;
  }

  watch(experienceId: string): Observable<Progress | null> {
    const subject = new Subject<Progress | null>();
    this.subjects.set(experienceId, subject);
    return new Observable<Progress | null>((subscriber) => {
      const subscription = subject.subscribe(subscriber);
      return () => {
        subscription.unsubscribe();
        this.unsubscribedExperienceIds.push(experienceId);
      };
    });
  }
}

describe('PuzzleSessionFacade', () => {
  let puzzleApi: FakePuzzleApiPort;
  let recipientSession: FakeRecipientSessionPort;
  let progressRepository: FakeProgressRepository;

  beforeEach(() => {
    puzzleApi = new FakePuzzleApiPort();
    recipientSession = new FakeRecipientSessionPort();
    progressRepository = new FakeProgressRepository();

    TestBed.configureTestingModule({
      providers: [
        { provide: PUZZLE_API_PORT, useValue: puzzleApi },
        { provide: RECIPIENT_SESSION_PORT, useValue: recipientSession },
        { provide: PROGRESS_REPOSITORY_PORT, useValue: progressRepository },
      ],
    });
  });

  function createFacade(): PuzzleSessionFacade {
    return TestBed.inject(PuzzleSessionFacade);
  }

  it('starts idle with no data', () => {
    const facade = createFacade();
    expect(facade.linkStatus()).toBe('idle');
    expect(facade.publicMeta()).toBeNull();
    expect(facade.experienceId()).toBeNull();
  });

  it('resolveLink signs in and exposes publicMeta on success', async () => {
    const facade = createFacade();

    await facade.resolveLink('pzl_abc');

    expect(facade.linkStatus()).toBe('ready');
    expect(facade.experienceId()).toBe('exp_1');
    expect(facade.publicMeta()).toEqual(SUCCESS.publicMeta);
    expect(recipientSession.signedInWith).toBe('tok_abc');
    expect(facade.errorMessage()).toBeNull();
  });

  it('starts watching progress after a successful resolve, and updates the progress signal live', async () => {
    const facade = createFacade();
    await facade.resolveLink('pzl_abc');

    const progress: Progress = {
      experienceId: 'exp_1',
      status: 'in_progress',
      pieces: {},
      startedAt: new Date(),
      lastUpdatedAt: new Date(),
      completedAt: null,
    };
    progressRepository.subjects.get('exp_1')!.next(progress);

    expect(facade.progress()).toEqual(progress);
  });

  it('treats a business failure (e.g. TOKEN_NOT_FOUND) as an invalid link, surfacing the server message', async () => {
    puzzleApi.resolveShareTokenResult = { ok: false, error: 'TOKEN_NOT_FOUND', message: 'This link is invalid or has expired.' };
    const facade = createFacade();

    await facade.resolveLink('pzl_bad');

    expect(facade.linkStatus()).toBe('invalid');
    expect(facade.errorKind()).toBe('invalid_link');
    expect(facade.errorMessage()).toBe('This link is invalid or has expired.');
    expect(recipientSession.signedInWith).toBeNull();
  });

  it('treats a rejected resolveShareToken call as an infra failure with a generic message', async () => {
    puzzleApi.resolveShareTokenResult = () => Promise.reject(new Error('functions/unavailable'));
    const facade = createFacade();

    await facade.resolveLink('pzl_abc');

    expect(facade.linkStatus()).toBe('invalid');
    expect(facade.errorKind()).toBe('infra');
    expect(facade.errorMessage()).toContain('check your connection');
  });

  it('treats a failed sign-in as an infra failure, without exposing publicMeta', async () => {
    recipientSession.signInShouldFail = true;
    const facade = createFacade();

    await facade.resolveLink('pzl_abc');

    expect(facade.linkStatus()).toBe('invalid');
    expect(facade.errorKind()).toBe('infra');
    expect(facade.publicMeta()).toBeNull();
  });

  it('unsubscribes the previous progress watch when resolveLink is called again', async () => {
    const facade = createFacade();
    await facade.resolveLink('pzl_abc');
    expect(progressRepository.unsubscribedExperienceIds).toEqual([]);

    await facade.resolveLink('pzl_abc');

    expect(progressRepository.unsubscribedExperienceIds).toEqual(['exp_1']);
  });

  it('resolveLink seeds pieceImageFor from unlockedPieceImages (resume-on-reload)', async () => {
    puzzleApi.resolveShareTokenResult = { ...SUCCESS, unlockedPieceImages: { q1: 'https://x/slice-q1.jpg' } };
    const facade = createFacade();

    await facade.resolveLink('pzl_abc');

    expect(facade.pieceImageFor('q1')).toBe('https://x/slice-q1.jpg');
    expect(facade.pieceImageFor('q2')).toBeNull();
  });

  describe('gameplay', () => {
    async function readyFacade(): Promise<PuzzleSessionFacade> {
      const facade = createFacade();
      await facade.resolveLink('pzl_abc');
      return facade;
    }

    it('pieceFor defaults to locked for a question with no progress yet', async () => {
      const facade = await readyFacade();
      expect(facade.pieceFor('q1')).toEqual({ status: 'locked', earnedVia: null, cluesUsed: 0, pointsAwarded: 0 });
    });

    it('score reflects zero pieces unlocked and no star rating before any progress exists', async () => {
      const facade = await readyFacade();
      expect(facade.score()).toEqual({ totalScore: 0, maxScore: 900, piecesUnlocked: 0, piecesRemaining: 9, starRating: null, breakdown: [] });
      expect(facade.isComplete()).toBeFalse();
    });

    it('score updates live from the realtime progress watch, reusing computeScore against real data', async () => {
      const facade = await readyFacade();

      progressRepository.subjects.get('exp_1')!.next({
        experienceId: 'exp_1',
        status: 'in_progress',
        pieces: {
          q1: { status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 },
          q2: { status: 'unlocked', earnedVia: 'clue', cluesUsed: 1, pointsAwarded: 75 },
        },
        startedAt: new Date(),
        lastUpdatedAt: new Date(),
        completedAt: null,
      });

      expect(facade.score().piecesUnlocked).toBe(2);
      expect(facade.score().totalScore).toBe(175);
      expect(facade.score().starRating).toBeNull();
    });

    it('openQuestion sets activeQuestion from publicMeta, and is a no-op for an already-unlocked piece', async () => {
      const facade = await readyFacade();
      progressRepository.subjects.get('exp_1')!.next({
        experienceId: 'exp_1',
        status: 'in_progress',
        pieces: { q1: { status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 } },
        startedAt: new Date(),
        lastUpdatedAt: new Date(),
        completedAt: null,
      });

      facade.openQuestion('q1');
      expect(facade.activeQuestion()).toBeNull();

      facade.closeQuestion();
      progressRepository.subjects.get('exp_1')!.next({
        experienceId: 'exp_1',
        status: 'in_progress',
        pieces: {},
        startedAt: new Date(),
        lastUpdatedAt: new Date(),
        completedAt: null,
      });
      facade.openQuestion('q1');
      expect(facade.activeQuestion()).toEqual({ questionId: 'q1', prompt: 'Where did we meet?' });
    });

    it('closeQuestion clears active question and any submit outcome', async () => {
      const facade = await readyFacade();
      facade.openQuestion('q1');

      facade.closeQuestion();

      expect(facade.activeQuestion()).toBeNull();
      expect(facade.lastSubmitOutcome()).toBeNull();
    });

    it('submitAnswer calls the real Cloud Function (never a local correctness check) and caches the piece image on a correct answer', async () => {
      const facade = await readyFacade();
      facade.openQuestion('q1');
      puzzleApi.submitAnswerResult = {
        ok: true,
        correct: true,
        questionIndex: 'q1',
        cluesUsed: 0,
        earnedVia: 'direct',
        pointsAwarded: 100,
        feedbackTier: 'youre_awesome',
        feedbackMessage: 'Nailed it!',
        pieceImageUrl: 'https://x/slice-q1.jpg',
        piecesUnlocked: 1,
        piecesRemaining: 8,
      };

      await facade.submitAnswer('Cubbon Park');

      expect(puzzleApi.submitAnswerCalls).toEqual([{ questionIndex: 'q1', answer: 'Cubbon Park' }]);
      expect(facade.isActiveSolved()).toBeTrue();
      expect(facade.pieceImageFor('q1')).toBe('https://x/slice-q1.jpg');
      expect(facade.answerError()).toBeNull();
    });

    it('submitAnswer surfaces an incorrect answer without caching an image or solving the question', async () => {
      const facade = await readyFacade();
      facade.openQuestion('q1');
      puzzleApi.submitAnswerResult = { ok: true, correct: false, questionIndex: 'q1', attemptNumber: 1, clueAvailable: true, cluesUsedSoFar: 0, partnerHelpAvailable: false };

      await facade.submitAnswer('wrong guess');

      expect(facade.isActiveSolved()).toBeFalse();
      expect(facade.pieceImageFor('q1')).toBeNull();
      expect(facade.lastSubmitOutcome()).toEqual(puzzleApi.submitAnswerResult as SubmitAnswerResult);
    });

    it('submitAnswer surfaces a business failure message', async () => {
      const facade = await readyFacade();
      facade.openQuestion('q1');
      puzzleApi.submitAnswerResult = { ok: false, error: 'RATE_LIMITED', message: 'Too many attempts — please wait.' };

      await facade.submitAnswer('guess');

      expect(facade.answerError()).toBe('Too many attempts — please wait.');
      expect(facade.isActiveSolved()).toBeFalse();
    });

    it('submitAnswer surfaces a generic message on a genuine infra failure', async () => {
      const facade = await readyFacade();
      facade.openQuestion('q1');
      puzzleApi.submitAnswerResult = () => Promise.reject(new Error('functions/unavailable'));

      await facade.submitAnswer('guess');

      expect(facade.answerError()).toContain('Check your connection');
      expect(facade.submitting()).toBeFalse();
    });

    it('submitAnswer is a no-op with no active question', async () => {
      const facade = await readyFacade();

      await facade.submitAnswer('guess');

      expect(puzzleApi.submitAnswerCalls).toEqual([]);
    });
  });

  describe('clues', () => {
    async function readyFacadeWithOpenQuestion(): Promise<PuzzleSessionFacade> {
      const facade = createFacade();
      await facade.resolveLink('pzl_abc');
      facade.openQuestion('q1');
      return facade;
    }

    it('canRequestClueForActive defaults true (optimistic) for a fresh, locked question', async () => {
      const facade = await readyFacadeWithOpenQuestion();
      expect(facade.canRequestClueForActive()).toBeTrue();
    });

    it('requestClue calls the real Cloud Function and caches the returned clue text', async () => {
      const facade = await readyFacadeWithOpenQuestion();
      puzzleApi.requestClueResult = { ok: true, questionIndex: 'q1', clueNumber: 1, clueText: "It's near the water.", clueNumbersRemaining: 2 };

      await facade.requestClue();

      expect(puzzleApi.requestClueCalls).toEqual(['q1']);
      expect(facade.activeQuestionClues()).toEqual(["It's near the water."]);
    });

    it('accumulates clue text across multiple requests, in order', async () => {
      const facade = await readyFacadeWithOpenQuestion();
      puzzleApi.requestClueResult = { ok: true, questionIndex: 'q1', clueNumber: 1, clueText: 'First clue', clueNumbersRemaining: 2 };
      await facade.requestClue();
      puzzleApi.requestClueResult = { ok: true, questionIndex: 'q1', clueNumber: 2, clueText: 'Second clue', clueNumbersRemaining: 1 };
      await facade.requestClue();

      expect(facade.activeQuestionClues()).toEqual(['First clue', 'Second clue']);
    });

    it('hides the clue button once the server reports zero clues remaining — a question authored with fewer than 3 clues', async () => {
      const facade = await readyFacadeWithOpenQuestion();
      puzzleApi.requestClueResult = { ok: true, questionIndex: 'q1', clueNumber: 1, clueText: 'Only clue', clueNumbersRemaining: 0 };

      await facade.requestClue();

      expect(facade.canRequestClueForActive()).toBeFalse();
    });

    it('requestClue surfaces a business failure (e.g. NO_CLUES_REMAINING) without caching any text', async () => {
      const facade = await readyFacadeWithOpenQuestion();
      puzzleApi.requestClueResult = { ok: false, error: 'NO_CLUES_REMAINING', message: 'All 3 clues have already been used.' };

      await facade.requestClue();

      expect(facade.clueError()).toBe('All 3 clues have already been used.');
      expect(facade.activeQuestionClues()).toEqual([]);
    });

    it('requestClue surfaces a generic message on a genuine infra failure', async () => {
      const facade = await readyFacadeWithOpenQuestion();
      puzzleApi.requestClueResult = () => Promise.reject(new Error('functions/unavailable'));

      await facade.requestClue();

      expect(facade.clueError()).toContain('Check your connection');
      expect(facade.requestingClue()).toBeFalse();
    });

    it('requestClue is a no-op with no active question', async () => {
      const facade = createFacade();
      await facade.resolveLink('pzl_abc');

      await facade.requestClue();

      expect(puzzleApi.requestClueCalls).toEqual([]);
    });

    it('revealed clue text and clueNumbersRemaining survive closing and reopening the same question within a session', async () => {
      const facade = await readyFacadeWithOpenQuestion();
      puzzleApi.requestClueResult = { ok: true, questionIndex: 'q1', clueNumber: 1, clueText: 'Cached clue', clueNumbersRemaining: 2 };
      await facade.requestClue();

      facade.closeQuestion();
      facade.openQuestion('q1');

      expect(facade.activeQuestionClues()).toEqual(['Cached clue']);
    });
  });

  describe('partner help', () => {
    async function readyFacadeWithOpenQuestion(): Promise<PuzzleSessionFacade> {
      const facade = createFacade();
      await facade.resolveLink('pzl_abc');
      facade.openQuestion('q1');
      return facade;
    }

    it('canRequestPartnerHelpForActive is false with no information yet (no clue requested, no incorrect answer submitted)', async () => {
      const facade = await readyFacadeWithOpenQuestion();
      expect(facade.canRequestPartnerHelpForActive()).toBeFalse();
    });

    it('canRequestPartnerHelpForActive falls back to the server-computed flag on the last incorrect submitAnswer response', async () => {
      const facade = await readyFacadeWithOpenQuestion();
      puzzleApi.submitAnswerResult = { ok: true, correct: false, questionIndex: 'q1', attemptNumber: 4, clueAvailable: false, cluesUsedSoFar: 3, partnerHelpAvailable: true };

      await facade.submitAnswer('wrong');

      expect(facade.canRequestPartnerHelpForActive()).toBeTrue();
    });

    it('canRequestPartnerHelpForActive reuses the canRequestPartnerHelp domain rule directly once clueNumbersRemaining is known', async () => {
      const facade = await readyFacadeWithOpenQuestion();
      // A question authored with exactly 1 clue: after using it, 0 remain.
      puzzleApi.requestClueResult = { ok: true, questionIndex: 'q1', clueNumber: 1, clueText: 'Only clue', clueNumbersRemaining: 0 };
      await facade.requestClue();

      expect(facade.canRequestPartnerHelpForActive()).toBeTrue();
    });

    it('requestPartnerHelp calls the real Cloud Function, caches the piece image, and solves the question', async () => {
      const facade = await readyFacadeWithOpenQuestion();
      puzzleApi.requestPartnerHelpRevealResult = {
        ok: true,
        questionIndex: 'q1',
        earnedVia: 'partner_help',
        pointsAwarded: 10,
        feedbackTier: 'teasing_inside_jokes',
        feedbackMessage: 'Had to phone a friend, huh?',
        pieceImageUrl: 'https://x/slice-q1.jpg',
        piecesUnlocked: 1,
        piecesRemaining: 8,
      };

      await facade.requestPartnerHelp();

      expect(puzzleApi.requestPartnerHelpRevealCalls).toEqual(['q1']);
      expect(facade.isActiveSolved()).toBeTrue();
      expect(facade.lastPieceResolution()).toEqual({ message: 'Had to phone a friend, huh?', points: 10 });
      expect(facade.pieceImageFor('q1')).toBe('https://x/slice-q1.jpg');
    });

    it('requestPartnerHelp surfaces a business failure (e.g. CLUES_NOT_EXHAUSTED)', async () => {
      const facade = await readyFacadeWithOpenQuestion();
      puzzleApi.requestPartnerHelpRevealResult = { ok: false, error: 'CLUES_NOT_EXHAUSTED', message: 'Use all 3 clues first.' };

      await facade.requestPartnerHelp();

      expect(facade.partnerHelpError()).toBe('Use all 3 clues first.');
      expect(facade.isActiveSolved()).toBeFalse();
    });

    it('requestPartnerHelp surfaces a generic message on a genuine infra failure', async () => {
      const facade = await readyFacadeWithOpenQuestion();
      puzzleApi.requestPartnerHelpRevealResult = () => Promise.reject(new Error('functions/unavailable'));

      await facade.requestPartnerHelp();

      expect(facade.partnerHelpError()).toContain('Check your connection');
      expect(facade.requestingPartnerHelp()).toBeFalse();
    });

    it('requestPartnerHelp is a no-op with no active question', async () => {
      const facade = createFacade();
      await facade.resolveLink('pzl_abc');

      await facade.requestPartnerHelp();

      expect(puzzleApi.requestPartnerHelpRevealCalls).toEqual([]);
    });
  });

  describe('completion', () => {
    function allUnlockedProgress(): Progress {
      const pieces: Record<string, { status: 'unlocked'; earnedVia: 'direct'; cluesUsed: number; pointsAwarded: number }> = {};
      for (let i = 1; i <= 9; i++) {
        pieces[`q${i}`] = { status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 };
      }
      return { experienceId: 'exp_1', status: 'completed', pieces, startedAt: new Date(), lastUpdatedAt: new Date(), completedAt: new Date() };
    }

    const COMPLETION_SUCCESS: CompletionSummaryResult = {
      ok: true,
      finalScore: 900,
      maxScore: 900,
      starRating: 3,
      starLabel: 'You know them by heart',
      completionMessage: 'You remembered every single one!',
      finalRevealImageUrl: 'https://x/reveal.jpg',
      perQuestionBreakdown: [],
    };

    it('automatically fetches the completion summary exactly once, the instant isComplete() flips true', async () => {
      const facade = createFacade();
      await facade.resolveLink('pzl_abc');
      puzzleApi.getCompletionSummaryResult = COMPLETION_SUCCESS;

      progressRepository.subjects.get('exp_1')!.next(allUnlockedProgress());
      TestBed.inject(ApplicationRef).tick();
      await Promise.resolve();
      await Promise.resolve();

      expect(facade.isComplete()).toBeTrue();
      expect(puzzleApi.getCompletionSummaryCalls).toBe(1);
      expect(facade.completionSummary()).toEqual(COMPLETION_SUCCESS);

      // A second, redundant progress emission (e.g. lastUpdatedAt churn) must not re-fetch.
      progressRepository.subjects.get('exp_1')!.next(allUnlockedProgress());
      TestBed.inject(ApplicationRef).tick();
      await Promise.resolve();

      expect(puzzleApi.getCompletionSummaryCalls).toBe(1);
    });

    it('loadCompletionSummary surfaces a business failure', async () => {
      const facade = createFacade();
      await facade.resolveLink('pzl_abc');
      puzzleApi.getCompletionSummaryResult = { ok: false, error: 'NOT_YET_COMPLETED', message: '2 pieces remaining.' };

      await facade.loadCompletionSummary();

      expect(facade.completionError()).toBe('2 pieces remaining.');
      expect(facade.completionSummary()).toBeNull();
    });

    it('loadCompletionSummary surfaces a generic message on a genuine infra failure', async () => {
      const facade = createFacade();
      await facade.resolveLink('pzl_abc');
      puzzleApi.getCompletionSummaryResult = () => Promise.reject(new Error('functions/unavailable'));

      await facade.loadCompletionSummary();

      expect(facade.completionError()).toContain('Check your connection');
      expect(facade.loadingCompletion()).toBeFalse();
    });

    it('loadCompletionSummary is callable again as an explicit retry after a failure', async () => {
      const facade = createFacade();
      await facade.resolveLink('pzl_abc');
      puzzleApi.getCompletionSummaryResult = { ok: false, error: 'NOT_YET_COMPLETED', message: 'not yet' };
      await facade.loadCompletionSummary();
      expect(facade.completionError()).toBe('not yet');

      puzzleApi.getCompletionSummaryResult = COMPLETION_SUCCESS;
      await facade.loadCompletionSummary();

      expect(facade.completionError()).toBeNull();
      expect(facade.completionSummary()).toEqual(COMPLETION_SUCCESS);
    });
  });
});
