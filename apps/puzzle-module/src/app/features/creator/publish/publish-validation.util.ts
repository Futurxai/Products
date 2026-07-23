/**
 * Maps `canPublish()`'s machine-readable `missingFields` (e.g.
 * `questions.q4.correctAnswer`, `revealImage`) onto Publish-page copy.
 * Feature-local, not `domain/` — turning a field path into UI text is
 * presentation logic, the same reasoning `status-badge.util.ts`
 * documents for its own status-to-tone mapping.
 */
const QUESTION_FIELD_LABELS: Readonly<Record<string, string>> = {
  prompt: 'is missing its question text',
  correctAnswer: 'is missing a correct answer',
  clues: 'has too many clues (max 3)',
};

const TOP_LEVEL_FIELD_MESSAGES: Readonly<Record<string, string>> = {
  questions: 'All 9 questions must be added before publishing.',
  revealImage: 'Upload a reveal photo.',
  welcomeNote: 'Add a welcome message for your recipient.',
  completionMessage: 'Add a completion message for when they finish.',
  partnerHelpChallenge: 'Add an "Ask Your Partner" challenge.',
};

/** Converts one `canPublish()` field path into a single friendly sentence. */
export function describeMissingField(field: string): string {
  const questionMatch = field.match(/^questions\.q(\d)\.(\w+)$/);
  if (questionMatch) {
    const [, questionNumber, subField] = questionMatch;
    const label = QUESTION_FIELD_LABELS[subField] ?? `has an issue with "${subField}"`;
    return `Question ${questionNumber} ${label}.`;
  }
  return TOP_LEVEL_FIELD_MESSAGES[field] ?? `"${field}" is incomplete.`;
}

/** De-duplicated, ordered list of friendly messages for every missing field. */
export function describeMissingFields(missingFields: readonly string[]): readonly string[] {
  return [...new Set(missingFields.map(describeMissingField))];
}
