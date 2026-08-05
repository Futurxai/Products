import { EarnedVia } from '../models/question.model';
import { Progress } from '../models/progress.model';

/**
 * Server-side persistence contract for Recipient progress. Every
 * mutating method here is a candidate for concurrent calls — a
 * Recipient can double-tap "submit," open the link on two tabs, or
 * retry after a flaky connection — so each one names an ATOMIC
 * business operation and the Firestore implementation
 * (`infrastructure/firestore-progress.store.ts`) is expected to use a
 * transaction internally. The port itself stays storage-agnostic.
 */
export interface ProgressStorePort {
  getProgress(experienceId: string): Promise<Progress | null>;

  /**
   * Creates the progress document on the Recipient's first ever action,
   * if it doesn't already exist. Idempotent and concurrency-safe: two
   * near-simultaneous first actions (e.g. two browser tabs) must not
   * create two documents or silently overwrite one's early progress.
   */
  initializeIfAbsent(experienceId: string): Promise<Progress>;

  /**
   * Atomically increments the attempt counter for one question and
   * returns the new count — the primitive `RateLimitedError` is built
   * on top of, in the application layer, not here (this port only
   * reports the count; deciding what's "too many" is a business rule).
   */
  recordAnswerAttempt(experienceId: string, questionId: string): Promise<number>;

  /**
   * Atomically records that one more clue was used for a question and
   * returns the new clue count. Rejects (throws `NoCluesRemainingError`)
   * if called again once `availableClueCount` has already been reached,
   * or `AlreadyUnlockedError` if the piece is already unlocked —
   * enforced via a transactional read-then-write, not a blind increment.
   *
   * `availableClueCount` is the number of clues THIS question actually
   * has authored (0–3, Business Rule #2 — a creator isn't required to
   * write all 3). It is deliberately a caller-supplied parameter rather
   * than this port defaulting to the domain's `MAX_CLUES_PER_QUESTION`
   * constant: that constant is the upper bound on how many CAN exist,
   * not how many DO exist for a specific question, and conflating the
   * two would let a clue request succeed past the question's real
   * authored content.
   */
  recordClueUsed(experienceId: string, questionId: string, availableClueCount: number): Promise<number>;

  /**
   * Atomically resolves a piece — the single write path for both a
   * correct direct/clue-assisted answer AND a partner-help reveal.
   * Updates the piece, recomputes the aggregate score, and flips
   * `status` to `'completed'` if this was the 9th piece — all inside
   * one transaction, so a `getCompletionSummary` call can never
   * observe a state where 9 pieces are unlocked but status still says
   * `in_progress`.
   */
  resolvePiece(params: {
    experienceId: string;
    questionId: string;
    earnedVia: EarnedVia;
    cluesUsed: number;
    pointsAwarded: number;
  }): Promise<Progress>;
}
