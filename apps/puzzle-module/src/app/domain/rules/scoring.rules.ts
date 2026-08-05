import { PieceProgress } from '../models/progress.model';
import { EarnedVia } from '../models/question.model';
import { ScoreBreakdownEntry, ScoreSummary } from '../models/score.model';
import {
  MAX_CLUES_PER_QUESTION,
  MAX_SCORE,
  POINTS_BY_CLUES_USED,
  POINTS_DIRECT,
  POINTS_PARTNER_HELP,
  QUESTIONS_PER_EXPERIENCE,
  STAR_THRESHOLDS,
} from '../models/constants';

/**
 * The single source of truth for "how many points is this piece worth."
 * Whoever WRITES a piece's `pointsAwarded` (the `submitAnswer` /
 * `requestPartnerHelpReveal` Cloud Functions, built in M2) must call
 * this — never invent a point value inline. Because Firestore rules
 * deny direct client writes to `puzzle_progress` (Phase 5 §10), this
 * function running server-side is what makes the score authoritative,
 * not just documentation of intent.
 *
 * @throws if `cluesUsed` is inconsistent with `earnedVia` — this is a
 * programmer error (a caller passing bad state), not a recoverable
 * business condition, so it throws rather than returning a sentinel.
 */
export function pointsForPiece(earnedVia: EarnedVia, cluesUsed: number): number {
  switch (earnedVia) {
    case 'direct':
      if (cluesUsed !== 0) {
        throw new Error(`Invalid state: earnedVia='direct' but cluesUsed=${cluesUsed} (expected 0).`);
      }
      return POINTS_DIRECT;

    case 'partner_help':
      // Flat rate regardless of cluesUsed: a question may have fewer
      // than MAX_CLUES_PER_QUESTION authored clues (Business Rule #2),
      // so partner-help can legitimately trigger at 0, 1, 2, or 3 —
      // whatever that specific question's actual clue count was. Only
      // sanity-bound it against the domain's absolute upper limit; the
      // real "were this question's clues actually exhausted" check is
      // `canRequestPartnerHelp`'s job, already enforced before this
      // is ever called.
      if (cluesUsed < 0 || cluesUsed > MAX_CLUES_PER_QUESTION) {
        throw new Error(`Invalid state: earnedVia='partner_help' but cluesUsed=${cluesUsed} is out of range 0..${MAX_CLUES_PER_QUESTION}.`);
      }
      return POINTS_PARTNER_HELP;

    case 'clue': {
      const points = POINTS_BY_CLUES_USED[cluesUsed as 1 | 2 | 3];
      if (points === undefined) {
        throw new Error(`Invalid state: earnedVia='clue' but cluesUsed=${cluesUsed} (expected 1, 2, or 3).`);
      }
      return points;
    }
  }
}

/** Star rating for a total score, per the PRD's Reward System thresholds. Always ≥1 — completion is never rated zero stars. */
export function starRatingFor(totalScore: number): 1 | 2 | 3 {
  const match = STAR_THRESHOLDS.find((t) => totalScore >= t.minScore);
  // STAR_THRESHOLDS always has a { minScore: 0, stars: 1 } floor entry, so this is unreachable —
  // the fallback exists purely so the return type isn't `1 | 2 | 3 | undefined`.
  return match?.stars ?? 1;
}

/**
 * The completion-screen copy for each star rating (PRD §13, Reward
 * System / Phase 3 test-data `05-score-reward-examples.json`). Kept
 * here, not inline in `getCompletionSummary` (the Cloud Function that
 * happens to need it, M2) — same reasoning as `feedback.rules.ts`'s
 * message bank: this is business-rule copy, not an infrastructure
 * detail, so it belongs in the one place both the Cloud Function and
 * the client Preview (M3 Feature 4) read it from.
 */
const STAR_LABELS: Readonly<Record<1 | 2 | 3, string>> = {
  3: 'You know them by heart',
  2: 'You know them well',
  1: "You made it — that's what counts",
};

export function starLabelFor(stars: 1 | 2 | 3): string {
  return STAR_LABELS[stars];
}

/**
 * Aggregates a Recipient's current piece state into a full score
 * summary — the correctness meter reads this, and it's the same shape
 * `getCompletionSummary` (Phase 3 Cloud Function contract) returns once
 * every piece is unlocked.
 */
export function computeScore(pieces: Readonly<Record<string, PieceProgress>>): ScoreSummary {
  const breakdown: ScoreBreakdownEntry[] = [];
  let totalScore = 0;
  let piecesUnlocked = 0;

  for (const [questionId, piece] of Object.entries(pieces)) {
    if (piece.status !== 'unlocked' || piece.earnedVia === null) {
      continue;
    }
    piecesUnlocked += 1;
    totalScore += piece.pointsAwarded;
    breakdown.push({
      questionId,
      earnedVia: piece.earnedVia,
      cluesUsed: piece.cluesUsed,
      pointsAwarded: piece.pointsAwarded,
    });
  }

  const piecesRemaining = QUESTIONS_PER_EXPERIENCE - piecesUnlocked;

  return {
    totalScore,
    maxScore: MAX_SCORE,
    piecesUnlocked,
    piecesRemaining,
    starRating: piecesRemaining === 0 ? starRatingFor(totalScore) : null,
    breakdown,
  };
}
