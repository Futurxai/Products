import { TestBed } from '@angular/core/testing';
import { Functions } from '@angular/fire/functions';

import { FirebaseFunctionsPuzzleApiService } from './functions-puzzle-api.service';

describe('FirebaseFunctionsPuzzleApiService', () => {
  let service: FirebaseFunctionsPuzzleApiService;

  function stubCallFunction(fn: jasmine.Spy): void {
    (service as unknown as { callFunction: jasmine.Spy }).callFunction = fn;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: Functions, useValue: {} }] });
    service = TestBed.inject(FirebaseFunctionsPuzzleApiService);
  });

  describe('publishExperience', () => {
    it('calls the publishExperience function and returns the result as-is on success', async () => {
      const callFunction = jasmine.createSpy('callFunction').and.resolveTo({ ok: true, shareToken: 'pzl_abc', shareUrl: 'https://x/pzl_abc', status: 'published' });
      stubCallFunction(callFunction);

      const result = await service.publishExperience('exp_1');

      expect(callFunction).toHaveBeenCalledWith('publishExperience', { experienceId: 'exp_1' });
      expect(result).toEqual({ ok: true, shareToken: 'pzl_abc', shareUrl: 'https://x/pzl_abc', status: 'published' });
    });

    it('passes a business failure through unchanged', async () => {
      const failure = { ok: false as const, error: 'INCOMPLETE_EXPERIENCE' as const, message: '3 fields missing.' };
      stubCallFunction(jasmine.createSpy('callFunction').and.resolveTo(failure));

      const result = await service.publishExperience('exp_1');

      expect(result).toEqual(failure);
    });

    it('lets a genuine infra/network failure propagate as a rejected promise', async () => {
      stubCallFunction(jasmine.createSpy('callFunction').and.rejectWith(new Error('functions/unavailable')));

      await expectAsync(service.publishExperience('exp_1')).toBeRejectedWithError('functions/unavailable');
    });
  });

  describe('resolveShareToken', () => {
    it('passes the request through and returns the result as-is', async () => {
      const success = {
        ok: true as const,
        experienceId: 'exp_1',
        customToken: 'tok',
        publicMeta: {
          occasion: 'Anniversary',
          emotion: 'Love',
          recipientDisplayName: 'Ananya',
          welcomeNote: 'Hi',
          status: 'published',
          lockedPatternImageUrl: 'https://x/pattern.svg',
          questions: [{ questionId: 'q1', prompt: 'Where did we meet?' }],
          partnerHelpChallenge: 'Ask them nicely',
        },
        unlockedPieceImages: { q1: 'https://x/slice-q1.jpg' },
      };
      const callFunction = jasmine.createSpy('callFunction').and.resolveTo(success);
      stubCallFunction(callFunction);

      const result = await service.resolveShareToken('pzl_abc');

      expect(callFunction).toHaveBeenCalledWith('resolveShareToken', { shareToken: 'pzl_abc' });
      expect(result).toEqual(success);
    });
  });

  describe('submitAnswer', () => {
    it('maps a correct-answer response, renaming questionId to questionIndex', async () => {
      stubCallFunction(
        jasmine.createSpy('callFunction').and.resolveTo({
          ok: true,
          correct: true,
          questionId: 'q3',
          cluesUsed: 1,
          earnedVia: 'clue',
          pointsAwarded: 75,
          feedbackTier: 'nudge_to_remember',
          feedbackMessage: 'Needed a little nudge!',
          pieceImageUrl: 'https://x/q3.jpg',
          piecesUnlocked: 3,
          piecesRemaining: 6,
        }),
      );

      const result = await service.submitAnswer('q3', 'fishermans wharf');

      expect(result).toEqual({
        ok: true,
        correct: true,
        questionIndex: 'q3',
        cluesUsed: 1,
        earnedVia: 'clue',
        pointsAwarded: 75,
        feedbackTier: 'nudge_to_remember',
        feedbackMessage: 'Needed a little nudge!',
        pieceImageUrl: 'https://x/q3.jpg',
        piecesUnlocked: 3,
        piecesRemaining: 6,
      });
    });

    it('maps an incorrect-answer response, renaming questionId to questionIndex', async () => {
      stubCallFunction(
        jasmine.createSpy('callFunction').and.resolveTo({
          ok: true,
          correct: false,
          questionId: 'q5',
          attemptNumber: 4,
          clueAvailable: false,
          cluesUsedSoFar: 3,
          partnerHelpAvailable: true,
        }),
      );

      const result = await service.submitAnswer('q5', 'wrong');

      expect(result).toEqual({ ok: true, correct: false, questionIndex: 'q5', attemptNumber: 4, clueAvailable: false, cluesUsedSoFar: 3, partnerHelpAvailable: true });
    });

    it('passes a business failure through unchanged', async () => {
      const failure = { ok: false as const, error: 'ALREADY_UNLOCKED' as const, message: 'Already unlocked.' };
      stubCallFunction(jasmine.createSpy('callFunction').and.resolveTo(failure));

      expect(await service.submitAnswer('q1', 'x')).toEqual(failure);
    });
  });

  describe('requestClue', () => {
    it('maps a success response, renaming questionId to questionIndex', async () => {
      stubCallFunction(jasmine.createSpy('callFunction').and.resolveTo({ ok: true, questionId: 'q4', clueNumber: 2, clueText: "It's a brewery.", clueNumbersRemaining: 1 }));

      const result = await service.requestClue('q4');

      expect(result).toEqual({ ok: true, questionIndex: 'q4', clueNumber: 2, clueText: "It's a brewery.", clueNumbersRemaining: 1 });
    });

    it('passes a business failure through unchanged', async () => {
      const failure = { ok: false as const, error: 'NO_CLUES_REMAINING' as const, message: 'All 3 clues used.' };
      stubCallFunction(jasmine.createSpy('callFunction').and.resolveTo(failure));

      expect(await service.requestClue('q4')).toEqual(failure);
    });
  });

  describe('requestPartnerHelpReveal', () => {
    it('maps a success response, renaming questionId to questionIndex', async () => {
      stubCallFunction(
        jasmine.createSpy('callFunction').and.resolveTo({
          ok: true,
          questionId: 'q5',
          earnedVia: 'partner_help',
          pointsAwarded: 10,
          feedbackTier: 'teasing_inside_jokes',
          feedbackMessage: 'Had to phone a friend, huh?',
          pieceImageUrl: 'https://x/q5.jpg',
          piecesUnlocked: 5,
          piecesRemaining: 4,
        }),
      );

      const result = await service.requestPartnerHelpReveal('q5');

      expect(result).toEqual({
        ok: true,
        questionIndex: 'q5',
        earnedVia: 'partner_help',
        pointsAwarded: 10,
        feedbackTier: 'teasing_inside_jokes',
        feedbackMessage: 'Had to phone a friend, huh?',
        pieceImageUrl: 'https://x/q5.jpg',
        piecesUnlocked: 5,
        piecesRemaining: 4,
      });
    });

    it('passes a business failure through unchanged', async () => {
      const failure = { ok: false as const, error: 'CLUES_NOT_EXHAUSTED' as const, message: 'Use all 3 clues first.' };
      stubCallFunction(jasmine.createSpy('callFunction').and.resolveTo(failure));

      expect(await service.requestPartnerHelpReveal('q5')).toEqual(failure);
    });
  });

  describe('logRecipientEvent', () => {
    it('calls the logRecipientEvent function with the given event name', async () => {
      const callFunction = jasmine.createSpy('callFunction').and.resolveTo({});
      stubCallFunction(callFunction);

      await service.logRecipientEvent('recipient.welcome_viewed');

      expect(callFunction).toHaveBeenCalledWith('logRecipientEvent', { eventName: 'recipient.welcome_viewed' });
    });

    it('lets a genuine infra/network failure propagate as a rejected promise', async () => {
      stubCallFunction(jasmine.createSpy('callFunction').and.rejectWith(new Error('functions/unavailable')));

      await expectAsync(service.logRecipientEvent('celebration.viewed')).toBeRejectedWithError('functions/unavailable');
    });
  });

  describe('getCompletionSummary', () => {
    it('maps a success response, renaming questionId to questionIndex in the breakdown', async () => {
      stubCallFunction(
        jasmine.createSpy('callFunction').and.resolveTo({
          ok: true,
          finalScore: 800,
          maxScore: 900,
          starRating: 3,
          starLabel: 'You know them by heart',
          completionMessage: 'You remembered every single one!',
          finalRevealImageUrl: 'https://x/reveal.jpg',
          perQuestionBreakdown: [
            { questionId: 'q1', earnedVia: 'direct', pointsAwarded: 100 },
            { questionId: 'q2', earnedVia: 'clue', pointsAwarded: 75 },
          ],
        }),
      );

      const result = await service.getCompletionSummary();

      expect(result).toEqual({
        ok: true,
        finalScore: 800,
        maxScore: 900,
        starRating: 3,
        starLabel: 'You know them by heart',
        completionMessage: 'You remembered every single one!',
        finalRevealImageUrl: 'https://x/reveal.jpg',
        perQuestionBreakdown: [
          { questionIndex: 'q1', earnedVia: 'direct', pointsAwarded: 100 },
          { questionIndex: 'q2', earnedVia: 'clue', pointsAwarded: 75 },
        ],
      });
    });

    it('passes a business failure through unchanged', async () => {
      const failure = { ok: false as const, error: 'NOT_YET_COMPLETED' as const, message: '4 pieces remaining.' };
      stubCallFunction(jasmine.createSpy('callFunction').and.resolveTo(failure));

      expect(await service.getCompletionSummary()).toEqual(failure);
    });
  });
});
