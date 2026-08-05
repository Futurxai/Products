import { defineRecipientCallable } from './define-callable';
import { submitAnswerSchema } from '../schemas/submit-answer.schema';
import { submitAnswer } from '../application/submit-answer.usecase';
import { buildDependencies } from '../infrastructure/dependencies';
import { createLogger } from '../config/logger';

export const submitAnswerCallable = defineRecipientCallable({
  functionName: 'submitAnswer',
  schema: submitAnswerSchema,
  handler: (input, experienceId) => {
    const deps = buildDependencies();
    return submitAnswer(
      {
        experienceStore: deps.experienceStore,
        progressStore: deps.progressStore,
        eventLogStore: deps.eventLogStore,
        storageService: deps.storageService,
        logger: createLogger({ functionName: 'submitAnswer', experienceId, questionId: input.questionIndex }),
      },
      { experienceId, questionId: input.questionIndex, answer: input.answer },
    );
  },
});
