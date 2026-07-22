import { defineRecipientCallable } from './define-callable';
import { requestClueSchema } from '../schemas/request-clue.schema';
import { requestClue } from '../application/request-clue.usecase';
import { buildDependencies } from '../infrastructure/dependencies';
import { createLogger } from '../config/logger';

export const requestClueCallable = defineRecipientCallable({
  functionName: 'requestClue',
  schema: requestClueSchema,
  handler: (input, experienceId) => {
    const deps = buildDependencies();
    return requestClue(
      {
        experienceStore: deps.experienceStore,
        progressStore: deps.progressStore,
        logger: createLogger({ functionName: 'requestClue', experienceId, questionId: input.questionIndex }),
      },
      { experienceId, questionId: input.questionIndex },
    );
  },
});
