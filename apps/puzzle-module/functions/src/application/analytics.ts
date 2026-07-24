import { EventLogStorePort } from '../domain/ports/event-log-store.port';
import { ActorRole, AnalyticsEventName } from '../domain/models/analytics-event.model';
import { Progress } from '../domain/models/progress.model';
import { computeScore } from '../domain/rules/scoring.rules';
import { ScopedLogger } from '../config/logger';

/**
 * Logs one analytics event, best-effort. A failure here must never
 * turn an otherwise-successful gameplay action (a correct answer, a
 * revealed clue) into a user-facing error — analytics is observability,
 * not a business precondition. Awaited rather than fire-and-forget:
 * Cloud Functions v2 doesn't guarantee un-awaited work survives past
 * the point the handler's response is sent, so "best-effort" here means
 * "try once, swallow the failure," not "don't wait for it."
 */
export async function logEventSafely(
  eventLogStore: EventLogStorePort,
  logger: ScopedLogger,
  params: {
    eventName: AnalyticsEventName;
    experienceId: string;
    actorRole: ActorRole;
    payload?: Readonly<Record<string, unknown>>;
  },
): Promise<void> {
  try {
    await eventLogStore.logEvent(params);
  } catch (error) {
    logger.error('Failed to log analytics event', {
      eventName: params.eventName,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Shared by `submitAnswer` and `requestPartnerHelpReveal` — both are a
 * candidate for resolving the 9th and final piece, and `puzzle.completed`
 * must be logged exactly once, at the exact usecase call that actually
 * caused the transition, not re-derived later from a `getCompletionSummary`
 * read (which a client may repeat, e.g. a retry after a dropped
 * connection). `updatedProgress` is what `ProgressStorePort.resolvePiece`
 * just returned — `status` only reads `'completed'` on the call that
 * caused it, per `firestore-progress.store.ts`'s transaction.
 */
export async function maybeLogPuzzleCompleted(
  eventLogStore: EventLogStorePort,
  logger: ScopedLogger,
  experienceId: string,
  updatedProgress: Progress,
): Promise<void> {
  if (updatedProgress.status !== 'completed') {
    return;
  }
  const score = computeScore(updatedProgress.pieces);
  const completedAt = updatedProgress.completedAt ?? updatedProgress.lastUpdatedAt;
  await logEventSafely(eventLogStore, logger, {
    eventName: 'puzzle.completed',
    experienceId,
    actorRole: 'recipient',
    payload: {
      finalScore: score.totalScore,
      starRating: score.starRating,
      timeToCompleteMs: completedAt.getTime() - updatedProgress.startedAt.getTime(),
    },
  });
}
