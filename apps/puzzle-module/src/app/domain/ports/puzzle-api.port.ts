import { EarnedVia } from '../models/question.model';

/**
 * The six server-side operations from
 * docs/puzzle-module/test-data/09-cloud-function-examples.md, as a
 * dependency-inverted port. `infrastructure/firebase/functions-puzzle-api.service.ts`
 * (M2) implements this by calling the actual Firebase Callable
 * Functions; `application/*` use-cases (M3/M5) depend on this
 * interface only, never on `@angular/fire/functions` directly.
 *
 * Every method mirrors the request/response shapes already specified
 * and agreed in Phase 3, rather than inventing a new contract here —
 * the test-data doc and this port must not drift apart.
 */

export type ApiError =
  | 'TOKEN_NOT_FOUND'
  | 'INCOMPLETE_EXPERIENCE'
  | 'NO_CLUES_REMAINING'
  | 'CLUES_NOT_EXHAUSTED'
  | 'NOT_YET_COMPLETED'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'EXPERIENCE_ALREADY_STARTED';

/** Common failure shape shared by every callable — one error-handling path client-side. */
export interface ApiFailure {
  readonly ok: false;
  readonly error: ApiError;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface PublishExperienceSuccess {
  readonly ok: true;
  readonly shareToken: string;
  readonly shareUrl: string;
  readonly status: 'published';
}
export type PublishExperienceResult = PublishExperienceSuccess | ApiFailure;

export interface ResolveShareTokenSuccess {
  readonly ok: true;
  readonly experienceId: string;
  readonly sessionRef: string;
  readonly publicMeta: {
    readonly occasion: string;
    readonly emotion: string;
    readonly recipientDisplayName: string;
    readonly welcomeNote: string;
    readonly status: string;
    readonly lockedPatternImageUrl: string;
  };
}
export type ResolveShareTokenResult = ResolveShareTokenSuccess | ApiFailure;

export interface SubmitAnswerCorrect {
  readonly ok: true;
  readonly correct: true;
  readonly questionIndex: string;
  readonly cluesUsed: number;
  readonly earnedVia: EarnedVia;
  readonly pointsAwarded: number;
  readonly feedbackTier: 'youre_awesome' | 'nudge_to_remember' | 'teasing_inside_jokes';
  readonly feedbackMessage: string;
  readonly pieceImageUrl: string;
  readonly piecesUnlocked: number;
  readonly piecesRemaining: number;
}
export interface SubmitAnswerIncorrect {
  readonly ok: true;
  readonly correct: false;
  readonly questionIndex: string;
  readonly attemptNumber: number;
  readonly clueAvailable: boolean;
  readonly cluesUsedSoFar: number;
  readonly partnerHelpAvailable?: boolean;
}
export type SubmitAnswerResult = SubmitAnswerCorrect | SubmitAnswerIncorrect | ApiFailure;

export interface RequestClueSuccess {
  readonly ok: true;
  readonly questionIndex: string;
  readonly clueNumber: number;
  readonly clueText: string;
  readonly clueNumbersRemaining: number;
}
export type RequestClueResult = RequestClueSuccess | ApiFailure;

export interface RequestPartnerHelpRevealSuccess {
  readonly ok: true;
  readonly questionIndex: string;
  readonly earnedVia: 'partner_help';
  readonly pointsAwarded: number;
  readonly feedbackTier: 'teasing_inside_jokes';
  readonly feedbackMessage: string;
  readonly pieceImageUrl: string;
  readonly piecesUnlocked: number;
  readonly piecesRemaining: number;
}
export type RequestPartnerHelpRevealResult = RequestPartnerHelpRevealSuccess | ApiFailure;

export interface CompletionSummarySuccess {
  readonly ok: true;
  readonly finalScore: number;
  readonly maxScore: number;
  readonly starRating: 1 | 2 | 3;
  readonly starLabel: string;
  readonly completionMessage: string;
  readonly finalRevealImageUrl: string;
  readonly perQuestionBreakdown: ReadonlyArray<{
    readonly questionIndex: string;
    readonly earnedVia: EarnedVia;
    readonly pointsAwarded: number;
  }>;
}
export type CompletionSummaryResult = CompletionSummarySuccess | ApiFailure;

export interface PuzzleApiPort {
  publishExperience(experienceId: string): Promise<PublishExperienceResult>;
  resolveShareToken(shareToken: string): Promise<ResolveShareTokenResult>;
  submitAnswer(sessionRef: string, questionIndex: string, answer: string): Promise<SubmitAnswerResult>;
  requestClue(sessionRef: string, questionIndex: string): Promise<RequestClueResult>;
  requestPartnerHelpReveal(sessionRef: string, questionIndex: string): Promise<RequestPartnerHelpRevealResult>;
  getCompletionSummary(sessionRef: string): Promise<CompletionSummaryResult>;
}
