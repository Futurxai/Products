import { z } from 'zod';

/**
 * Shared primitives for the six callable request schemas. Runtime
 * validation happens here, at the infrastructure edge — the domain
 * layer's `QuestionDefinition`/`PuzzleExperience` types describe
 * shapes, they don't enforce them against untrusted network input.
 */

export const experienceIdSchema = z.string().trim().min(1, 'experienceId is required');

export const shareTokenSchema = z.string().trim().min(8, 'shareToken looks too short to be valid');

/** Matches the QUESTION_IDS constant in the domain layer: q1..q9. */
export const questionIndexSchema = z
  .string()
  .regex(/^q[1-9]$/, 'questionIndex must be one of q1..q9');

/** Generous but bounded — prevents a pathological payload, not a real user's longest true answer. */
export const answerSchema = z.string().trim().min(1, 'answer must not be empty').max(500, 'answer is too long');
