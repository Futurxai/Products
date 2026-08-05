import { PuzzleExperience } from '../../domain/models/puzzle-experience.model';
import { QuestionDefinition } from '../../domain/models/question.model';
import { QUESTION_IDS } from '../../domain/models/constants';

/** A fully-authored, publish-ready experience — the common starting point for use-case tests. */
export function seedExperience(overrides: Partial<PuzzleExperience> = {}): PuzzleExperience {
  const questions: QuestionDefinition[] = QUESTION_IDS.map((questionId) => ({
    questionId,
    prompt: `Prompt for ${questionId}`,
    correctAnswer: `answer-${questionId}`,
    acceptedVariants: [`Answer-${questionId}`],
    clues: [`clue1-${questionId}`, `clue2-${questionId}`, `clue3-${questionId}`],
  }));

  return {
    experienceId: 'exp_test',
    creatorId: 'cre_test',
    shareTokenHash: null,
    occasion: 'Anniversary',
    emotion: 'Love',
    recipientDisplayName: 'Test Recipient',
    status: 'draft',
    welcomeNote: 'Welcome!',
    completionMessage: 'You did it!',
    partnerHelpChallenge: 'Buy me ice cream',
    lockedPatternImagePath: 'puzzle_storage/_shared/patterns/frame-outline.svg',
    revealImagePath: 'puzzle_storage/cre_test/exp_test/reveal-image.jpg',
    questions,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    publishedAt: null,
    completedAt: null,
    archivedAt: null,
    ...overrides,
  };
}
