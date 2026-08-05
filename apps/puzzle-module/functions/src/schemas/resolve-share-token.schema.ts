import { z } from 'zod';
import { shareTokenSchema } from './common';

export const resolveShareTokenSchema = z.object({
  shareToken: shareTokenSchema,
});

export type ResolveShareTokenRequest = z.infer<typeof resolveShareTokenSchema>;
