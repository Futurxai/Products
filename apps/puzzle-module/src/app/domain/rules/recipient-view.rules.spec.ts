import { QuestionDefinition } from '../models/question.model';
import { toRecipientQuestionView } from './recipient-view.rules';

describe('toRecipientQuestionView', () => {
  it('keeps only questionId and prompt', () => {
    const question: QuestionDefinition = {
      questionId: 'q3',
      prompt: "What's the name of the restaurant where I proposed?",
      correctAnswer: "Fisherman's Wharf",
      acceptedVariants: ['Fishermans Wharf'],
      clues: ['clue 1', 'clue 2', 'clue 3'],
    };

    const view = toRecipientQuestionView(question);

    expect(view).toEqual({ questionId: 'q3', prompt: "What's the name of the restaurant where I proposed?" });
  });

  it('never leaks correctAnswer, acceptedVariants, or clues onto the result object', () => {
    const question: QuestionDefinition = {
      questionId: 'q1',
      prompt: 'Prompt',
      correctAnswer: 'secret answer',
      acceptedVariants: ['variant'],
      clues: ['clue'],
    };

    const view = toRecipientQuestionView(question);

    expect(Object.keys(view).sort()).toEqual(['prompt', 'questionId']);
  });
});
