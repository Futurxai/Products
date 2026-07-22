import { EarnedVia } from './question.model';

export interface ScoreBreakdownEntry {
  readonly questionId: string;
  readonly earnedVia: EarnedVia;
  readonly cluesUsed: number;
  readonly pointsAwarded: number;
}

export interface ScoreSummary {
  readonly totalScore: number;
  readonly maxScore: number;
  readonly piecesUnlocked: number;
  readonly piecesRemaining: number;
  /** `null` until every piece is unlocked — completion is what makes a rating meaningful. */
  readonly starRating: 1 | 2 | 3 | null;
  readonly breakdown: readonly ScoreBreakdownEntry[];
}
