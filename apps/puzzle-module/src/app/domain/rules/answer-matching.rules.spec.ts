import { QuestionDefinition } from '../models/question.model';
import { isAnswerCorrect } from './answer-matching.rules';

describe('isAnswerCorrect', () => {
  // Drawn from docs/puzzle-module/test-data/03-puzzle-experiences.json, exp_001/q1
  const question: QuestionDefinition = {
    questionId: 'q1',
    prompt: 'Where did we go on our very first date?',
    correctAnswer: 'Cubbon Park',
    acceptedVariants: ['Cubbon Park, Bangalore', 'Cubbon Park Bengaluru'],
    clues: ['clue 1', 'clue 2', 'clue 3'],
  };

  it('accepts an exact match', () => {
    expect(isAnswerCorrect('Cubbon Park', question)).toBeTrue();
  });

  it('is case-insensitive', () => {
    expect(isAnswerCorrect('cubbon park', question)).toBeTrue();
    expect(isAnswerCorrect('CUBBON PARK', question)).toBeTrue();
  });

  it('trims leading/trailing whitespace', () => {
    expect(isAnswerCorrect('  Cubbon Park  ', question)).toBeTrue();
  });

  it('collapses internal repeated whitespace', () => {
    expect(isAnswerCorrect('Cubbon   Park', question)).toBeTrue();
  });

  it('accepts any listed variant, not just the canonical answer', () => {
    expect(isAnswerCorrect('Cubbon Park, Bangalore', question)).toBeTrue();
    expect(isAnswerCorrect('cubbon park bengaluru', question)).toBeTrue();
  });

  it('rejects an incorrect answer', () => {
    expect(isAnswerCorrect('Lalbagh', question)).toBeFalse();
  });

  it('rejects an empty or whitespace-only submission without matching an empty accepted value', () => {
    expect(isAnswerCorrect('', question)).toBeFalse();
    expect(isAnswerCorrect('   ', question)).toBeFalse();
  });

  it('does not fuzzy-match a near-miss typo — no fuzzy matching in MVP (PRD Future Roadmap #10)', () => {
    expect(isAnswerCorrect('Cubon Park', question)).toBeFalse();
  });
});
