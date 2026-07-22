import { PieceProgress } from '../models/progress.model';
import { draftExperience, PuzzleExperience } from '../models/puzzle-experience.model';
import { emptyQuestion, QuestionDefinition } from '../models/question.model';
import {
  canEdit,
  canPublish,
  canRequestPartnerHelp,
  canUnpublish,
  isExperienceComplete,
  validateQuestion,
} from './lifecycle.rules';

function completeQuestion(id: string): QuestionDefinition {
  return {
    questionId: id,
    prompt: `Prompt for ${id}`,
    correctAnswer: 'answer',
    acceptedVariants: [],
    clues: ['clue 1', 'clue 2', 'clue 3'],
  };
}

function fullyAuthoredExperience(overrides: Partial<PuzzleExperience> = {}): PuzzleExperience {
  const base = draftExperience({
    experienceId: 'exp_test',
    creatorId: 'cre_test',
    occasion: 'Anniversary',
    recipientDisplayName: 'Test Recipient',
  });
  return {
    ...base,
    questions: Array.from({ length: 9 }, (_, i) => completeQuestion(`q${i + 1}`)),
    revealImagePath: 'puzzle_storage/cre_test/exp_test/reveal-image.jpg',
    welcomeNote: 'Welcome!',
    completionMessage: 'You did it!',
    partnerHelpChallenge: 'Buy me ice cream',
    ...overrides,
  };
}

describe('validateQuestion', () => {
  it('passes for a fully authored question', () => {
    expect(validateQuestion(completeQuestion('q1')).ok).toBeTrue();
  });

  it('flags a missing prompt', () => {
    const result = validateQuestion({ ...completeQuestion('q1'), prompt: '  ' });
    expect(result.ok).toBeFalse();
    expect(result.missingFields).toContain('questions.q1.prompt');
  });

  it('flags a missing correct answer', () => {
    const result = validateQuestion({ ...completeQuestion('q1'), correctAnswer: '' });
    expect(result.ok).toBeFalse();
    expect(result.missingFields).toContain('questions.q1.correctAnswer');
  });

  it('allows 0 clues — Business Rule #2 says 0–3, not required', () => {
    expect(validateQuestion({ ...completeQuestion('q1'), clues: [] }).ok).toBeTrue();
  });

  it('flags more than 3 clues', () => {
    const result = validateQuestion({ ...completeQuestion('q1'), clues: ['a', 'b', 'c', 'd'] });
    expect(result.ok).toBeFalse();
    expect(result.missingFields).toContain('questions.q1.clues');
  });
});

describe('canPublish', () => {
  it('passes for a fully authored 9-question experience', () => {
    expect(canPublish(fullyAuthoredExperience()).ok).toBeTrue();
  });

  it('rejects fewer than 9 questions', () => {
    const experience = fullyAuthoredExperience({ questions: [completeQuestion('q1')] });
    const result = canPublish(experience);
    expect(result.ok).toBeFalse();
    expect(result.missingFields).toContain('questions');
  });

  it('rejects a missing reveal image', () => {
    const result = canPublish(fullyAuthoredExperience({ revealImagePath: null }));
    expect(result.ok).toBeFalse();
    expect(result.missingFields).toContain('revealImage');
  });

  it('rejects a missing welcome note, completion message, or partner-help challenge', () => {
    expect(canPublish(fullyAuthoredExperience({ welcomeNote: '' })).missingFields).toContain('welcomeNote');
    expect(canPublish(fullyAuthoredExperience({ completionMessage: '' })).missingFields).toContain(
      'completionMessage',
    );
    expect(canPublish(fullyAuthoredExperience({ partnerHelpChallenge: '' })).missingFields).toContain(
      'partnerHelpChallenge',
    );
  });

  it('surfaces per-question errors when some of the 9 are incomplete', () => {
    const questions = Array.from({ length: 9 }, (_, i) => completeQuestion(`q${i + 1}`));
    questions[3] = emptyQuestion('q4');
    const result = canPublish(fullyAuthoredExperience({ questions }));

    expect(result.ok).toBeFalse();
    expect(result.missingFields).toContain('questions.q4.prompt');
    expect(result.missingFields).toContain('questions.q4.correctAnswer');
  });
});

describe('canEdit', () => {
  it('always allows editing a draft', () => {
    const draft = fullyAuthoredExperience({ status: 'draft' });
    expect(canEdit(draft, false)).toBeTrue();
    expect(canEdit(draft, true)).toBeTrue(); // hasProgress is meaningless pre-publish, but must not block
  });

  it('allows editing a published experience with no recipient progress yet', () => {
    const published = fullyAuthoredExperience({ status: 'published' });
    expect(canEdit(published, false)).toBeTrue();
  });

  it('blocks editing a published experience once progress exists — Business Rule #10', () => {
    const published = fullyAuthoredExperience({ status: 'published' });
    expect(canEdit(published, true)).toBeFalse();
  });

  it('blocks editing once the experience is in_progress, completed, or archived, regardless of progress flag', () => {
    for (const status of ['in_progress', 'completed', 'archived'] as const) {
      const experience = fullyAuthoredExperience({ status });
      expect(canEdit(experience, false)).toBeFalse();
    }
  });
});

describe('canUnpublish', () => {
  it('allows reverting to draft when no progress exists', () => {
    expect(canUnpublish(fullyAuthoredExperience({ status: 'published' }), false)).toBeTrue();
  });

  it('blocks reverting once a recipient has started', () => {
    expect(canUnpublish(fullyAuthoredExperience({ status: 'published' }), true)).toBeFalse();
  });

  it('is not applicable to a draft (nothing to unpublish)', () => {
    expect(canUnpublish(fullyAuthoredExperience({ status: 'draft' }), false)).toBeFalse();
  });
});

describe('canRequestPartnerHelp', () => {
  function piece(overrides: Partial<PieceProgress>): PieceProgress {
    return { status: 'locked', earnedVia: null, cluesUsed: 0, pointsAwarded: 0, ...overrides };
  }

  it('is unavailable before all of a question\'s clues are used', () => {
    expect(canRequestPartnerHelp(piece({ cluesUsed: 2 }), 3)).toBeFalse();
  });

  it('becomes available once all 3 clues are used and the piece is still locked', () => {
    expect(canRequestPartnerHelp(piece({ cluesUsed: 3 }), 3)).toBeTrue();
  });

  it('is unavailable once the piece is already unlocked, even with all clues used', () => {
    expect(canRequestPartnerHelp(piece({ cluesUsed: 3, status: 'unlocked' }), 3)).toBeFalse();
  });

  it('respects a question with fewer than 3 authored clues — unlocks after just those, not a fixed 3', () => {
    expect(canRequestPartnerHelp(piece({ cluesUsed: 1 }), 1)).toBeTrue();
    expect(canRequestPartnerHelp(piece({ cluesUsed: 0 }), 1)).toBeFalse();
  });

  it('is unavailable for a question with zero authored clues until cluesUsed also reaches zero-and-locked', () => {
    // Edge case: 0 authored clues means partner-help is available immediately
    // once the piece is locked and an incorrect attempt has been made —
    // there was never a clue to use in the first place.
    expect(canRequestPartnerHelp(piece({ cluesUsed: 0 }), 0)).toBeTrue();
  });
});

describe('isExperienceComplete', () => {
  function piece(overrides: Partial<PieceProgress>): PieceProgress {
    return { status: 'locked', earnedVia: null, cluesUsed: 0, pointsAwarded: 0, ...overrides };
  }

  it('is false when fewer than 9 pieces are recorded', () => {
    expect(isExperienceComplete({ q1: piece({ status: 'unlocked' }) })).toBeFalse();
  });

  it('is false when any of the 9 pieces is still locked', () => {
    const pieces: Record<string, PieceProgress> = {};
    for (let i = 1; i <= 9; i++) {
      pieces[`q${i}`] = piece({ status: i === 5 ? 'locked' : 'unlocked' });
    }
    expect(isExperienceComplete(pieces)).toBeFalse();
  });

  it('is true once all 9 pieces are unlocked', () => {
    const pieces: Record<string, PieceProgress> = {};
    for (let i = 1; i <= 9; i++) {
      pieces[`q${i}`] = piece({ status: 'unlocked' });
    }
    expect(isExperienceComplete(pieces)).toBeTrue();
  });
});
