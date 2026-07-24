import { defineRecipientCallable } from './define-callable';
import { logRecipientEventSchema } from '../schemas/log-recipient-event.schema';
import { logRecipientEvent } from '../application/log-recipient-event.usecase';
import { buildDependencies } from '../infrastructure/dependencies';
import { createLogger } from '../config/logger';

export const logRecipientEventCallable = defineRecipientCallable({
  functionName: 'logRecipientEvent',
  schema: logRecipientEventSchema,
  handler: (input, experienceId) => {
    const deps = buildDependencies();
    return logRecipientEvent(
      {
        eventLogStore: deps.eventLogStore,
        logger: createLogger({ functionName: 'logRecipientEvent', experienceId }),
      },
      { experienceId, eventName: input.eventName },
    );
  },
});
