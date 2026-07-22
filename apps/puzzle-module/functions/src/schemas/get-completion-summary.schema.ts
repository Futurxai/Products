import { z } from 'zod';

/** No fields at all — experienceId comes entirely from the caller's auth claim. */
export const getCompletionSummarySchema = z.object({}).strict();

export type GetCompletionSummaryRequest = z.infer<typeof getCompletionSummarySchema>;
