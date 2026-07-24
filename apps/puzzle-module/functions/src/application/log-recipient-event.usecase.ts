import { EventLogStorePort } from '../domain/ports/event-log-store.port';
import { ScopedLogger } from '../config/logger';
import { logEventSafely } from './analytics';

export interface LogRecipientEventDeps {
  eventLogStore: EventLogStorePort;
  logger: ScopedLogger;
}

export interface LogRecipientEventInput {
  experienceId: string;
  eventName: 'recipient.welcome_viewed' | 'celebration.viewed';
}

/**
 * The only Recipient-callable path that logs an event directly rather
 * than as a side effect of a gameplay operation — restricted by the
 * request schema's closed enum to the couple of moments that are
 * purely client-observable (nothing server-side happens when a
 * Recipient's screen renders). `experienceId` comes from the verified
 * `experienceId` custom claim (`defineRecipientCallable`), never a
 * client-supplied field — a Recipient can only ever log against the
 * one experience their session is actually scoped to.
 */
export async function logRecipientEvent(deps: LogRecipientEventDeps, input: LogRecipientEventInput): Promise<Record<string, never>> {
  await logEventSafely(deps.eventLogStore, deps.logger, {
    eventName: input.eventName,
    experienceId: input.experienceId,
    actorRole: 'recipient',
  });
  return {};
}
