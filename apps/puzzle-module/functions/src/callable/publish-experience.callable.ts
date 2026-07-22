import { defineCreatorCallable } from './define-callable';
import { publishExperienceSchema } from '../schemas/publish-experience.schema';
import { publishExperience } from '../application/publish-experience.usecase';
import { buildDependencies } from '../infrastructure/dependencies';
import { createLogger } from '../config/logger';

export const publishExperienceCallable = defineCreatorCallable({
  functionName: 'publishExperience',
  schema: publishExperienceSchema,
  handler: (input, requesterUid) => {
    const deps = buildDependencies();
    return publishExperience(
      { experienceStore: deps.experienceStore, tokenService: deps.tokenService, logger: createLogger({ functionName: 'publishExperience' }) },
      { experienceId: input.experienceId, requesterUid },
    );
  },
});
