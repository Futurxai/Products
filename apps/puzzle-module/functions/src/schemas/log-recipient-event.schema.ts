import { z } from 'zod';

/**
 * Deliberately a closed enum, not `z.string()` — the whole point of
 * this callable is that a Recipient client can NEVER log an arbitrary
 * event name (e.g. a fabricated `puzzle.completed`). Only low-stakes,
 * purely-client-observable view events belong here; every other event
 * name (`question.answered_correct`, `piece.unlocked`, `puzzle.completed`,
 * ...) is logged server-side as a side effect of the real operation
 * that earns it, never through this path.
 */
export const logRecipientEventSchema = z.object({
  eventName: z.enum(['recipient.welcome_viewed', 'celebration.viewed']),
});
