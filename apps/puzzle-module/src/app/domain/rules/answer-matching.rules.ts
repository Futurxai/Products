import { QuestionDefinition } from '../models/question.model';

/**
 * Case-insensitive, whitespace-trimmed comparison against the correct
 * answer or any accepted variant (PRD §17, Question & Hint Logic).
 * Deliberately no fuzzy/typo-tolerant matching in MVP — that's an
 * explicit Future Roadmap item (#10), not an oversight here.
 *
 * This is the single source of truth for "is this answer right,"
 * called from both the `submitAnswer` Cloud Function (authoritative —
 * built in M2) and, optionally, client-side for instant local feedback
 * before the network round-trip. The client-side use is a UX nicety
 * only — the server always re-validates, per the Module Contract's
 * security boundary (§8).
 */
export function isAnswerCorrect(submittedAnswer: string, question: QuestionDefinition): boolean {
  const normalized = normalize(submittedAnswer);
  if (normalized.length === 0) {
    return false;
  }

  const acceptable = [question.correctAnswer, ...question.acceptedVariants];
  return acceptable.some((candidate) => normalize(candidate) === normalized);
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
