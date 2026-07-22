/**
 * How a puzzle piece was ultimately earned. Drives both the scoring
 * tier (PRD §13) and the feedback-message tier shown to the recipient.
 */
export type EarnedVia = 'direct' | 'clue' | 'partner_help';

/**
 * One of the 9 question/answer/clue triples a Creator authors.
 * `clues` may contain 0–3 entries (Business Rule #2) — nothing enforces
 * exactly 3 at the type level, `lifecycle.rules.ts` validates that at
 * publish time instead, where a helpful error message is more useful
 * than a compile error.
 */
export interface QuestionDefinition {
  readonly questionId: string;
  readonly prompt: string;
  readonly correctAnswer: string;
  readonly acceptedVariants: readonly string[];
  readonly clues: readonly string[];
}

/** A `QuestionDefinition` with no content yet — the wizard's starting point for each of the 9 slots. */
export function emptyQuestion(questionId: string): QuestionDefinition {
  return {
    questionId,
    prompt: '',
    correctAnswer: '',
    acceptedVariants: [],
    clues: [],
  };
}
