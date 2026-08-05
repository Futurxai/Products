import { ActorRole, AnalyticsEventName } from '../models/analytics-event.model';

/**
 * Server-side write path for `puzzle_events` (M5 Phase 1) — the ONLY
 * path. Firestore Rules (`lovedigitally-web/firestore.rules`) deny
 * every client write to this collection outright (`allow write: if
 * false`), same posture as `puzzle_progress`: analytics that a client
 * could fabricate directly (e.g. writing its own `puzzle.completed`)
 * wouldn't be analytics, it'd be an unverified claim. Every event this
 * module logs is either a side effect of an already-authoritative
 * server operation (`submitAnswer` logs `question.answered_correct`,
 * not the client), or — for the few purely-client-observable moments
 * like "Welcome Viewed" — goes through the narrowly-scoped
 * `logRecipientEvent` callable, which only accepts an allowlisted enum
 * of low-stakes view events, never a free-form event name.
 *
 * `eventId`/`timestamp` are assigned by the implementation (Firestore
 * auto-ID + `serverTimestamp()`), not the caller — a usecase logging an
 * event has no business minting its own event id or trusting its own
 * clock over the server's.
 */
export interface EventLogStorePort {
  logEvent(params: {
    eventName: AnalyticsEventName;
    experienceId: string;
    actorRole: ActorRole;
    payload?: Readonly<Record<string, unknown>>;
  }): Promise<void>;
}
