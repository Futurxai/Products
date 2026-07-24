import { EarnedVia, RecipientQuestionView } from '../models/question.model';
import { DomainErrorCode } from '../errors/domain-errors';

/**
 * The two client-observable moments with no corresponding server call to
 * hang off of (`resolveShareToken`/`submitAnswer`/etc. already log every
 * other event themselves — see `functions/src/application/analytics.ts`).
 * Deliberately a closed set, not `AnalyticsEventName` in full: the
 * `logRecipientEvent` callable's Zod schema (`functions/src/schemas/log-recipient-event.schema.ts`)
 * only allowlists these two, so a Recipient client can never claim a
 * consequential event name like `puzzle.completed`.
 */
export type RecipientLoggableEventName = 'recipient.welcome_viewed' | 'celebration.viewed';

/**
 * The six server-side operations from
 * docs/puzzle-module/test-data/09-cloud-function-examples.md, as a
 * dependency-inverted port. `infrastructure/firebase/functions-puzzle-api.service.ts`
 * (M3/M5) implements this by calling the actual Firebase Callable
 * Functions built in M2; `application/*` use-cases depend on this
 * interface only, never on `@angular/fire/functions` directly.
 *
 * Every method mirrors the request/response shapes specified in Phase
 * 3, with one deliberate refinement made while actually implementing
 * the server side in M2: `resolveShareToken` returns a `customToken`
 * rather than an opaque `sessionRef` string. The client signs in with
 * it via Firebase Auth (`signInWithCustomToken`); every call after
 * that carries the resulting ID token automatically, so
 * `submitAnswer`/`requestClue`/`requestPartnerHelpReveal`/`getCompletionSummary`
 * don't take a session parameter at all — the server reads
 * `request.auth.token.experienceId` (the custom claim minted at
 * resolve time), which can't be spoofed the way a client-supplied
 * string could be. Phase 3's doc predates this and is left as
 * historical record of the original design intent, not updated to
 * match — this port is the current source of truth.
 */

/** Alias, not a second enum — `errors/domain-errors.ts` is the one canonical list of failure codes. */
export type ApiError = DomainErrorCode;

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
  /** Passed to `signInWithCustomToken` — after that, Firebase Auth handles the session, not application code. */
  readonly customToken: string;
  readonly publicMeta: {
    readonly occasion: string;
    readonly emotion: string;
    readonly recipientDisplayName: string;
    readonly welcomeNote: string;
    readonly status: string;
    readonly lockedPatternImageUrl: string;
    /**
     * Prompt-only projection of the 9 questions (M3/M4 addition —
     * `puzzle_experiences_private` is owner-only in Firestore Rules, so
     * this callable is the Recipient's only path to the question text
     * at all). Never `correctAnswer`/`acceptedVariants`/`clues` — see
     * `RecipientQuestionView`.
     */
    readonly questions: readonly RecipientQuestionView[];
    /** The Creator-authored "Ask Your Partner" fallback message (M3/M4 addition) — shown once a question's clues are exhausted, before `requestPartnerHelpReveal` is ever called. */
    readonly partnerHelpChallenge: string;
  };
  /**
   * Signed image URLs for pieces already unlocked before this resolve
   * call, keyed by `questionId` — empty on a first visit. `pieceImageUrl`
   * is otherwise only ever handed back once, inside the
   * `submitAnswer`/`requestPartnerHelpReveal` response that unlocked
   * it; without this, reopening a share link mid-game would show
   * correctly-unlocked tiles with nothing to render. See
   * `functions/src/application/resolve-share-token.usecase.ts`.
   */
  readonly unlockedPieceImages: Readonly<Record<string, string>>;
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
  /** Implicitly scoped to the signed-in session's experience — no experienceId/sessionRef parameter, see the port-level doc comment. */
  submitAnswer(questionIndex: string, answer: string): Promise<SubmitAnswerResult>;
  requestClue(questionIndex: string): Promise<RequestClueResult>;
  requestPartnerHelpReveal(questionIndex: string): Promise<RequestPartnerHelpRevealResult>;
  getCompletionSummary(): Promise<CompletionSummaryResult>;
  /**
   * Analytics is best-effort from the client's point of view: the
   * underlying Cloud Function never surfaces a logging failure as a
   * business rejection (see `logEventSafely`), so this resolves once
   * the call completes and only ever rejects on a genuine infra failure
   * (offline, etc) — callers fire-and-forget it and swallow that.
   */
  logRecipientEvent(eventName: RecipientLoggableEventName): Promise<void>;
}
