import { z } from 'zod';
import { answerSchema, questionIndexSchema } from './common';

/**
 * No `experienceId`/`sessionRef` field — the caller's experience is
 * derived from `request.auth.token.experienceId` (the custom claim
 * minted by `resolveShareToken`), never from client-supplied input.
 * See `domain/ports/puzzle-api.port.ts` for the full reasoning.
 */
export const submitAnswerSchema = z.object({
  questionIndex: questionIndexSchema,
  answer: answerSchema,
});

export type SubmitAnswerRequest = z.infer<typeof submitAnswerSchema>;
