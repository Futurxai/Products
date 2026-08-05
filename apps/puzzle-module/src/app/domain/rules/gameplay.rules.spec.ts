import { AlreadyUnlockedError, CluesNotExhaustedError, NoCluesRemainingError } from '../errors/domain-errors';
import { PieceProgress, lockedPiece } from '../models/progress.model';
import { QuestionDefinition } from '../models/question.model';
import { QUESTION_IDS } from '../models/constants';
import { AnswerCorrectOutcome, initialPieces, revealNextClue, resolvePartnerHelp, submitAnswerAttempt } from './gameplay.rules';

function question(overrides: Partial<QuestionDefinition> = {}): QuestionDefinition {
  return {
    questionId: 'q1',
    prompt: 'Where did we first meet?',
    correctAnswer: 'Fishermans Wharf',
    acceptedVariants: ['fishermans wharf'],
    clues: ['It rhymes with "wharf".', "It's near the bay.", 'San Francisco.'],
    ...overrides,
  };
}

function piece(overrides: Partial<PieceProgress> = {}): PieceProgress {
  return { ...lockedPiece(), ...overrides };
}

describe('initialPieces', () => {
  it('returns 9 locked pieces, one per QUESTION_IDS', () => {
    const pieces = initialPieces();
    expect(Object.keys(pieces)).toEqual([...QUESTION_IDS]);
    for (const id of QUESTION_IDS) {
      expect(pieces[id]).toEqual({ status: 'locked', earnedVia: null, cluesUsed: 0, pointsAwarded: 0 });
    }
  });
});

describe('submitAnswerAttempt', () => {
  it('resolves a correct answer with zero clues used as "direct", worth 100 points', () => {
    const outcome = submitAnswerAttempt(question(), piece(), 'Fishermans Wharf') as AnswerCorrectOutcome;

    expect(outcome.correct).toBeTrue();
    expect(outcome.earnedVia).toBe('direct');
    expect(outcome.pointsAwarded).toBe(100);
    expect(outcome.feedbackTier).toBe('youre_awesome');
    expect(outcome.piece).toEqual({ status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 });
  });

  it('accepts a case-insensitive, whitespace-trimmed match, and accepted variants', () => {
    expect((submitAnswerAttempt(question(), piece(), '  fishermans wharf  ') as AnswerCorrectOutcome).correct).toBeTrue();
  });

  it('resolves a correct answer after clues as "clue", tiered by clues used', () => {
    const outcome = submitAnswerAttempt(question(), piece({ cluesUsed: 2 }), 'Fishermans Wharf') as AnswerCorrectOutcome;

    expect(outcome.earnedVia).toBe('clue');
    expect(outcome.cluesUsed).toBe(2);
    expect(outcome.pointsAwarded).toBe(50);
    expect(outcome.feedbackTier).toBe('nudge_to_remember');
  });

  it('resolves an incorrect answer with clues still available', () => {
    const outcome = submitAnswerAttempt(question(), piece(), 'wrong answer');

    expect(outcome.correct).toBeFalse();
    if (outcome.correct) throw new Error('unreachable');
    expect(outcome.clueAvailable).toBeTrue();
    expect(outcome.cluesUsedSoFar).toBe(0);
    expect(outcome.partnerHelpAvailable).toBeFalse();
  });

  it('resolves an incorrect answer once all clues are exhausted — partner help becomes available', () => {
    const outcome = submitAnswerAttempt(question(), piece({ cluesUsed: 3 }), 'wrong answer');

    expect(outcome.correct).toBeFalse();
    if (outcome.correct) throw new Error('unreachable');
    expect(outcome.clueAvailable).toBeFalse();
    expect(outcome.partnerHelpAvailable).toBeTrue();
  });

  it('rejects an empty answer as incorrect, never as a false positive', () => {
    const outcome = submitAnswerAttempt(question(), piece(), '   ');
    expect(outcome.correct).toBeFalse();
  });

  it('throws AlreadyUnlockedError if the piece is already unlocked', () => {
    expect(() => submitAnswerAttempt(question(), piece({ status: 'unlocked' }), 'Fishermans Wharf')).toThrowError(AlreadyUnlockedError);
  });
});

describe('revealNextClue', () => {
  it('reveals clues in order, incrementing cluesUsed each time', () => {
    const first = revealNextClue(question(), piece());
    expect(first).toEqual({
      piece: { status: 'locked', earnedVia: null, cluesUsed: 1, pointsAwarded: 0 },
      clueNumber: 1,
      clueText: 'It rhymes with "wharf".',
      cluesRemaining: 2,
    });

    const second = revealNextClue(question(), first.piece);
    expect(second.clueNumber).toBe(2);
    expect(second.clueText).toBe("It's near the bay.");
    expect(second.cluesRemaining).toBe(1);
  });

  it('throws NoCluesRemainingError once every authored clue has been shown', () => {
    expect(() => revealNextClue(question(), piece({ cluesUsed: 3 }))).toThrowError(NoCluesRemainingError);
  });

  it('respects a question with fewer than 3 authored clues', () => {
    const q = question({ clues: ['only clue'] });
    expect(() => revealNextClue(q, piece({ cluesUsed: 1 }))).toThrowError(NoCluesRemainingError);
  });

  it('throws AlreadyUnlockedError if the piece is already unlocked', () => {
    expect(() => revealNextClue(question(), piece({ status: 'unlocked' }))).toThrowError(AlreadyUnlockedError);
  });
});

describe('resolvePartnerHelp', () => {
  it('unlocks the piece at the flat partner-help point value once eligible', () => {
    const outcome = resolvePartnerHelp(question(), piece({ cluesUsed: 3 }));

    expect(outcome.piece).toEqual({ status: 'unlocked', earnedVia: 'partner_help', cluesUsed: 3, pointsAwarded: 10 });
    expect(outcome.pointsAwarded).toBe(10);
    expect(outcome.feedbackTier).toBe('teasing_inside_jokes');
  });

  it('respects a question with fewer than 3 authored clues', () => {
    const q = question({ clues: ['only clue'] });
    const outcome = resolvePartnerHelp(q, piece({ cluesUsed: 1 }));
    expect(outcome.piece.status).toBe('unlocked');
  });

  it('throws CluesNotExhaustedError before all clues are used', () => {
    expect(() => resolvePartnerHelp(question(), piece({ cluesUsed: 1 }))).toThrowError(CluesNotExhaustedError);
  });

  it('throws CluesNotExhaustedError if the piece is already unlocked', () => {
    expect(() => resolvePartnerHelp(question(), piece({ cluesUsed: 3, status: 'unlocked' }))).toThrowError(CluesNotExhaustedError);
  });
});
