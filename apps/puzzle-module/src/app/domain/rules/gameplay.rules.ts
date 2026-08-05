import { AlreadyUnlockedError, CluesNotExhaustedError, NoCluesRemainingError } from '../errors/domain-errors';
import { lockedPiece, PieceProgress } from '../models/progress.model';
import { EarnedVia, QuestionDefinition } from '../models/question.model';
import { QUESTION_IDS } from '../models/constants';
import { isAnswerCorrect } from './answer-matching.rules';
import { FeedbackTier, feedbackTierFor, pickFeedbackMessage } from './feedback.rules';
import { canRequestPartnerHelp } from './lifecycle.rules';
import { pointsForPiece } from './scoring.rules';

/**
 * The pure "play one question" state machine — every gameplay action a
 * Recipient (or a Creator's Preview of their own draft, M3 Feature 4)
 * can take, expressed as input → output with no I/O. This is
 * deliberately the SAME sequence of rule calls
 * `functions/src/application/{submit-answer,request-clue,request-partner-help-reveal}.usecase.ts`
 * (M2) make, minus the parts that only make sense with a real,
 * persisted, concurrent session: Firestore transactions, the
 * answer-attempt rate limiter, and signed piece-image URLs. Those stay
 * server-side, where the security boundary (Module Contract §8)
 * actually lives.
 *
 * Preview calls these functions directly against local, ephemeral
 * state. The eventual M5 Recipient client never will — it always goes
 * through `PuzzleApiPort` (a real Cloud Function call) — but the Cloud
 * Functions themselves could be refactored to delegate their core
 * branching to these same functions, which is what makes "Preview and
 * Recipient cannot diverge" true in the way that matters: one function
 * decides what a correct/incorrect/clue/partner-help action does, not
 * two copies of the decision.
 */

export interface AnswerCorrectOutcome {
  readonly correct: true;
  readonly piece: PieceProgress;
  readonly earnedVia: EarnedVia;
  readonly cluesUsed: number;
  readonly pointsAwarded: number;
  readonly feedbackTier: FeedbackTier;
  readonly feedbackMessage: string;
}

export interface AnswerIncorrectOutcome {
  readonly correct: false;
  readonly clueAvailable: boolean;
  readonly cluesUsedSoFar: number;
  readonly partnerHelpAvailable: boolean;
}

export type AnswerAttemptOutcome = AnswerCorrectOutcome | AnswerIncorrectOutcome;

/** The 9-piece starting state for a fresh play-through — Business Rule #1. */
export function initialPieces(): Readonly<Record<string, PieceProgress>> {
  return Object.fromEntries(QUESTION_IDS.map((id) => [id, lockedPiece()]));
}

/**
 * Resolves one answer submission against one question/piece pair.
 * Mirrors `submit-answer.usecase.ts`'s branching exactly (see the
 * file-level doc comment for what's intentionally left out).
 *
 * @throws {AlreadyUnlockedError} if the piece is already unlocked — a
 * programmer/UI error (the answer input should be hidden by then), not
 * a recoverable business condition.
 */
export function submitAnswerAttempt(question: QuestionDefinition, piece: PieceProgress, answer: string): AnswerAttemptOutcome {
  if (piece.status === 'unlocked') {
    throw new AlreadyUnlockedError(question.questionId);
  }

  if (!isAnswerCorrect(answer, question)) {
    return {
      correct: false,
      clueAvailable: piece.cluesUsed < question.clues.length,
      cluesUsedSoFar: piece.cluesUsed,
      partnerHelpAvailable: canRequestPartnerHelp(piece, question.clues.length),
    };
  }

  const earnedVia: EarnedVia = piece.cluesUsed === 0 ? 'direct' : 'clue';
  const pointsAwarded = pointsForPiece(earnedVia, piece.cluesUsed);
  const feedbackTier = feedbackTierFor(earnedVia);

  return {
    correct: true,
    piece: { status: 'unlocked', earnedVia, cluesUsed: piece.cluesUsed, pointsAwarded },
    earnedVia,
    cluesUsed: piece.cluesUsed,
    pointsAwarded,
    feedbackTier,
    feedbackMessage: pickFeedbackMessage(feedbackTier),
  };
}

export interface ClueRevealOutcome {
  readonly piece: PieceProgress;
  readonly clueNumber: number;
  readonly clueText: string;
  readonly cluesRemaining: number;
}

/**
 * Reveals the next unused clue for a question. Mirrors
 * `request-clue.usecase.ts`, minus the atomic Firestore counter — a
 * single in-memory `Progress` has no concurrent-writer problem to
 * guard against.
 *
 * @throws {AlreadyUnlockedError} if the piece is already unlocked.
 * @throws {NoCluesRemainingError} if every authored clue for this
 * question has already been shown.
 */
export function revealNextClue(question: QuestionDefinition, piece: PieceProgress): ClueRevealOutcome {
  if (piece.status === 'unlocked') {
    throw new AlreadyUnlockedError(question.questionId);
  }
  if (piece.cluesUsed >= question.clues.length) {
    throw new NoCluesRemainingError(question.questionId);
  }

  const clueNumber = piece.cluesUsed + 1;
  const clueText = question.clues[clueNumber - 1];

  return {
    piece: { ...piece, cluesUsed: clueNumber },
    clueNumber,
    clueText,
    cluesRemaining: question.clues.length - clueNumber,
  };
}

export interface PartnerHelpOutcome {
  readonly piece: PieceProgress;
  readonly pointsAwarded: number;
  readonly feedbackTier: FeedbackTier;
  readonly feedbackMessage: string;
}

/**
 * Resolves an "Ask Your Partner" reveal — always succeeds once
 * eligible (Business Rule #4: unlocks after all of a question's
 * authored clues are exhausted). Mirrors
 * `request-partner-help-reveal.usecase.ts`.
 *
 * @throws {CluesNotExhaustedError} if requested before eligibility —
 * guards against a client skipping straight past the clue path.
 */
export function resolvePartnerHelp(question: QuestionDefinition, piece: PieceProgress): PartnerHelpOutcome {
  if (!canRequestPartnerHelp(piece, question.clues.length)) {
    throw new CluesNotExhaustedError(question.questionId, piece.cluesUsed);
  }

  const pointsAwarded = pointsForPiece('partner_help', piece.cluesUsed);
  const feedbackTier = feedbackTierFor('partner_help');

  return {
    piece: { status: 'unlocked', earnedVia: 'partner_help', cluesUsed: piece.cluesUsed, pointsAwarded },
    pointsAwarded,
    feedbackTier,
    feedbackMessage: pickFeedbackMessage(feedbackTier),
  };
}
