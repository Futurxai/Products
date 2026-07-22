/**
 * Business-rule constants (PRD §10, Business Rules #1–#3).
 *
 * Single source of truth — `rules/scoring.rules.ts` and
 * `rules/lifecycle.rules.ts` both derive from these rather than
 * hardcoding numbers a second time. If the puzzle ever grows beyond a
 * 3x3 grid (PRD Future Roadmap #9), this is the one place that changes.
 */

/** Fixed grid size for the MVP — Business Rule #1. */
export const QUESTIONS_PER_EXPERIENCE = 9;

/** `['q1', 'q2', ..., 'q9']` — the canonical question/piece identifiers. */
export const QUESTION_IDS: readonly string[] = Array.from(
  { length: QUESTIONS_PER_EXPERIENCE },
  (_, i) => `q${i + 1}`,
);

/** Up to 3 clues per question — Business Rule #2. */
export const MAX_CLUES_PER_QUESTION = 3;

/** Points awarded for a correct answer with zero clues used. */
export const POINTS_DIRECT = 100;

/** Points awarded for a correct answer, indexed by clues used (1, 2, or 3). */
export const POINTS_BY_CLUES_USED: Readonly<Record<1 | 2 | 3, number>> = {
  1: 75,
  2: 50,
  3: 30,
};

/** Points awarded when a piece is resolved via the partner-help fallback. */
export const POINTS_PARTNER_HELP = 10;

/** 9 questions × 100 points = 900 — the maximum possible score. */
export const MAX_SCORE = QUESTIONS_PER_EXPERIENCE * POINTS_DIRECT;

/** Star rating thresholds — PRD §13, Reward System. */
export const STAR_THRESHOLDS: ReadonlyArray<{ minScore: number; stars: 1 | 2 | 3 }> = [
  { minScore: 800, stars: 3 },
  { minScore: 500, stars: 2 },
  { minScore: 0, stars: 1 },
];
