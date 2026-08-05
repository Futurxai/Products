import { definePublicCallable } from './define-callable';
import { resolveShareTokenSchema } from '../schemas/resolve-share-token.schema';
import { resolveShareToken } from '../application/resolve-share-token.usecase';
import { buildDependencies } from '../infrastructure/dependencies';
import { createLogger } from '../config/logger';

export const resolveShareTokenCallable = definePublicCallable({
  functionName: 'resolveShareToken',
  schema: resolveShareTokenSchema,
  handler: (input) => {
    const deps = buildDependencies();
    return resolveShareToken(
      {
        experienceStore: deps.experienceStore,
        progressStore: deps.progressStore,
        eventLogStore: deps.eventLogStore,
        tokenService: deps.tokenService,
        authService: deps.authService,
        storageService: deps.storageService,
        logger: createLogger({ functionName: 'resolveShareToken' }),
      },
      { shareToken: input.shareToken },
    );
  },
});
