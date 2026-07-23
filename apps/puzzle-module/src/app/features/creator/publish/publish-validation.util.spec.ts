import { describeMissingField, describeMissingFields } from './publish-validation.util';

describe('describeMissingField', () => {
  it('describes a missing question prompt with its question number', () => {
    expect(describeMissingField('questions.q4.prompt')).toBe('Question 4 is missing its question text.');
  });

  it('describes a missing correct answer', () => {
    expect(describeMissingField('questions.q7.correctAnswer')).toBe('Question 7 is missing a correct answer.');
  });

  it('describes too many clues', () => {
    expect(describeMissingField('questions.q2.clues')).toBe('Question 2 has too many clues (max 3).');
  });

  it('describes the top-level fields with friendly copy', () => {
    expect(describeMissingField('questions')).toBe('All 9 questions must be added before publishing.');
    expect(describeMissingField('revealImage')).toBe('Upload a reveal photo.');
    expect(describeMissingField('welcomeNote')).toBe('Add a welcome message for your recipient.');
    expect(describeMissingField('completionMessage')).toBe('Add a completion message for when they finish.');
    expect(describeMissingField('partnerHelpChallenge')).toBe('Add an "Ask Your Partner" challenge.');
  });

  it('falls back to a generic message for an unrecognized field', () => {
    expect(describeMissingField('somethingNew')).toBe('"somethingNew" is incomplete.');
  });
});

describe('describeMissingFields', () => {
  it('maps and de-duplicates a list of missing fields', () => {
    const result = describeMissingFields(['questions.q1.prompt', 'questions.q1.correctAnswer', 'revealImage']);
    expect(result).toEqual(['Question 1 is missing its question text.', 'Question 1 is missing a correct answer.', 'Upload a reveal photo.']);
  });

  it('de-duplicates identical resulting messages', () => {
    const result = describeMissingFields(['questions.q1.prompt', 'questions.q2.prompt']);
    expect(result.length).toBe(2);
  });
});
