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

/**
 * What a Recipient may ever see of a question before earning its
 * piece — deliberately a narrower type than `QuestionDefinition`, not
 * the same interface with fields left unused. `correctAnswer`,
 * `acceptedVariants`, and `clues` have no way to end up here even by
 * accident, which is the point: the Module Contract §8 boundary
 * ("never sent to the client before earned") is expressed at the type
 * level, not just by convention. See `rules/recipient-view.rules.ts`
 * for the one place a `QuestionDefinition` is narrowed into this.
 */
export interface RecipientQuestionView {
  readonly questionId: string;
  readonly prompt: string;
}
