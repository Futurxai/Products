import { z } from 'zod';
import { experienceIdSchema } from './common';

export const publishExperienceSchema = z.object({
  experienceId: experienceIdSchema,
});

export type PublishExperienceRequest = z.infer<typeof publishExperienceSchema>;
