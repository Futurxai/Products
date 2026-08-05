import { defineRecipientCallable } from './define-callable';
import { getCompletionSummarySchema } from '../schemas/get-completion-summary.schema';
import { getCompletionSummary } from '../application/get-completion-summary.usecase';
import { buildDependencies } from '../infrastructure/dependencies';
import { createLogger } from '../config/logger';

export const getCompletionSummaryCallable = defineRecipientCallable({
  functionName: 'getCompletionSummary',
  schema: getCompletionSummarySchema,
  handler: (_input, experienceId) => {
    const deps = buildDependencies();
    return getCompletionSummary(
      {
        experienceStore: deps.experienceStore,
        progressStore: deps.progressStore,
        storageService: deps.storageService,
        logger: createLogger({ functionName: 'getCompletionSummary', experienceId }),
      },
      { experienceId },
    );
  },
});
