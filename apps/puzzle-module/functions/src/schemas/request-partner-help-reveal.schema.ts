import { z } from 'zod';
import { questionIndexSchema } from './common';

export const requestPartnerHelpRevealSchema = z.object({
  questionIndex: questionIndexSchema,
});

export type RequestPartnerHelpRevealRequest = z.infer<typeof requestPartnerHelpRevealSchema>;
