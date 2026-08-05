import { z } from 'zod';
import { questionIndexSchema } from './common';

export const requestClueSchema = z.object({
  questionIndex: questionIndexSchema,
});

export type RequestClueRequest = z.infer<typeof requestClueSchema>;
