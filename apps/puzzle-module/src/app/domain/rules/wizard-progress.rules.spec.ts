import { PuzzleExperience, draftExperience } from '../models/puzzle-experience.model';
import { emptyQuestion } from '../models/question.model';
import {
  firstIncompleteStep,
  isCompletionStepComplete,
  isImageStepComplete,
  isOccasionStepComplete,
  isQuestionsStepComplete,
  isRecipientStepComplete,
  isReviewStepComplete,
  validateImageFile,
  wizardStepCompletion,
} from './wizard-progress.rules';

function baseDraft(overrides: Partial<PuzzleExperience> = {}): PuzzleExperience {
  return {
    ...draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: '', recipientDisplayName: '' }),
    emotion: '',
    ...overrides,
  };
}

function nineValidQuestions() {
  return Array.from({ length: 9 }, (_, i) => ({
    ...emptyQuestion(`q${i + 1}`),
    prompt: `Question ${i + 1}?`,
    correctAnswer: `Answer ${i + 1}`,
  }));
}

describe('isOccasionStepComplete', () => {
  it('requires both occasion and emotion', () => {
    expect(isOccasionStepComplete(baseDraft())).toBeFalse();
    expect(isOccasionStepComplete(baseDraft({ occasion: 'Anniversary' }))).toBeFalse();
    expect(isOccasionStepComplete(baseDraft({ occasion: 'Anniversary', emotion: 'Love' }))).toBeTrue();
  });

  it('treats whitespace-only values as incomplete', () => {
    expect(isOccasionStepComplete(baseDraft({ occasion: '  ', emotion: 'Love' }))).toBeFalse();
  });
});

describe('isImageStepComplete', () => {
  it('is false until revealImagePath is set (server-confirmed, not client-upload-confirmed)', () => {
    expect(isImageStepComplete(baseDraft())).toBeFalse();
    expect(isImageStepComplete(baseDraft({ revealImagePath: 'puzzle_storage/cre_001/exp_1/reveal-image.jpg' }))).toBeTrue();
  });
});

describe('isRecipientStepComplete', () => {
  it('requires both recipient name and welcome note', () => {
    expect(isRecipientStepComplete(baseDraft())).toBeFalse();
    expect(isRecipientStepComplete(baseDraft({ recipientDisplayName: 'Ananya' }))).toBeFalse();
    expect(isRecipientStepComplete(baseDraft({ recipientDisplayName: 'Ananya', welcomeNote: 'Hi!' }))).toBeTrue();
  });
});

describe('isQuestionsStepComplete', () => {
  it('requires exactly 9 questions, all individually valid', () => {
    expect(isQuestionsStepComplete(baseDraft({ questions: [] }))).toBeFalse();
    expect(isQuestionsStepComplete(baseDraft({ questions: nineValidQuestions().slice(0, 8) }))).toBeFalse();
    expect(isQuestionsStepComplete(baseDraft({ questions: nineValidQuestions() }))).toBeTrue();
  });

  it('is false if any of the 9 questions is missing a prompt or answer', () => {
    const questions = nineValidQuestions();
    questions[3] = { ...questions[3], correctAnswer: '' };
    expect(isQuestionsStepComplete(baseDraft({ questions }))).toBeFalse();
  });
});

describe('isCompletionStepComplete', () => {
  it('requires both partnerHelpChallenge and completionMessage', () => {
    expect(isCompletionStepComplete(baseDraft())).toBeFalse();
    expect(isCompletionStepComplete(baseDraft({ partnerHelpChallenge: 'Ask Vikram' }))).toBeFalse();
    expect(isCompletionStepComplete(baseDraft({ partnerHelpChallenge: 'Ask Vikram', completionMessage: 'You did it!' }))).toBeTrue();
  });
});

describe('isReviewStepComplete / wizardStepCompletion', () => {
  it('is true only once every prior step is complete', () => {
    const complete = baseDraft({
      occasion: 'Anniversary',
      emotion: 'Love',
      revealImagePath: 'puzzle_storage/cre_001/exp_1/reveal-image.jpg',
      recipientDisplayName: 'Ananya',
      welcomeNote: 'Hi!',
      questions: nineValidQuestions(),
      partnerHelpChallenge: 'Ask Vikram',
      completionMessage: 'You did it!',
    });

    expect(isReviewStepComplete(complete)).toBeTrue();
    expect(wizardStepCompletion(complete)).toEqual({
      occasion: true,
      image: true,
      recipient: true,
      questions: true,
      completion: true,
      review: true,
    });
  });

  it('is false when any single step is incomplete', () => {
    const almostComplete = baseDraft({
      occasion: 'Anniversary',
      emotion: 'Love',
      revealImagePath: 'puzzle_storage/cre_001/exp_1/reveal-image.jpg',
      recipientDisplayName: 'Ananya',
      welcomeNote: 'Hi!',
      questions: nineValidQuestions(),
      // completion details left blank
    });

    expect(isReviewStepComplete(almostComplete)).toBeFalse();
    expect(wizardStepCompletion(almostComplete).completion).toBeFalse();
    expect(wizardStepCompletion(almostComplete).review).toBeFalse();
  });
});

describe('firstIncompleteStep', () => {
  it('returns the first incomplete step in wizard order', () => {
    expect(
      firstIncompleteStep({ occasion: true, image: false, recipient: false, questions: false, completion: false, review: false }),
    ).toBe('image');
  });

  it('returns occasion when nothing is complete', () => {
    expect(
      firstIncompleteStep({ occasion: false, image: false, recipient: false, questions: false, completion: false, review: false }),
    ).toBe('occasion');
  });

  it('returns review once every other step is complete', () => {
    expect(
      firstIncompleteStep({ occasion: true, image: true, recipient: true, questions: true, completion: true, review: true }),
    ).toBe('review');
  });
});

describe('validateImageFile', () => {
  it('accepts a well-formed jpeg/png/webp under the size limit', () => {
    expect(validateImageFile({ sizeBytes: 1024, mimeType: 'image/jpeg' })).toEqual({ ok: true, error: null });
    expect(validateImageFile({ sizeBytes: 1024, mimeType: 'image/png' })).toEqual({ ok: true, error: null });
    expect(validateImageFile({ sizeBytes: 1024, mimeType: 'image/webp' })).toEqual({ ok: true, error: null });
  });

  it('rejects a file over 10MB', () => {
    expect(validateImageFile({ sizeBytes: 10 * 1024 * 1024 + 1, mimeType: 'image/jpeg' })).toEqual({
      ok: false,
      error: 'too_large',
    });
  });

  it('rejects a file of exactly 10MB — Storage Rules use a strict less-than, so an exact match still fails server-side', () => {
    expect(validateImageFile({ sizeBytes: 10 * 1024 * 1024, mimeType: 'image/jpeg' })).toEqual({
      ok: false,
      error: 'too_large',
    });
  });

  it('accepts one byte under the limit', () => {
    expect(validateImageFile({ sizeBytes: 10 * 1024 * 1024 - 1, mimeType: 'image/jpeg' })).toEqual({ ok: true, error: null });
  });

  it('rejects an unsupported mime type, checked before the size', () => {
    expect(validateImageFile({ sizeBytes: 1024, mimeType: 'image/gif' })).toEqual({ ok: false, error: 'unsupported_type' });
    expect(validateImageFile({ sizeBytes: 1024, mimeType: 'application/pdf' })).toEqual({ ok: false, error: 'unsupported_type' });
  });
});
