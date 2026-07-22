import { defineRecipientCallable } from './define-callable';
import { requestPartnerHelpRevealSchema } from '../schemas/request-partner-help-reveal.schema';
import { requestPartnerHelpReveal } from '../application/request-partner-help-reveal.usecase';
import { buildDependencies } from '../infrastructure/dependencies';
import { createLogger } from '../config/logger';

export const requestPartnerHelpRevealCallable = defineRecipientCallable({
  functionName: 'requestPartnerHelpReveal',
  schema: requestPartnerHelpRevealSchema,
  handler: (input, experienceId) => {
    const deps = buildDependencies();
    return requestPartnerHelpReveal(
      {
        experienceStore: deps.experienceStore,
        progressStore: deps.progressStore,
        storageService: deps.storageService,
        logger: createLogger({ functionName: 'requestPartnerHelpReveal', experienceId, questionId: input.questionIndex }),
      },
      { experienceId, questionId: input.questionIndex },
    );
  },
});
