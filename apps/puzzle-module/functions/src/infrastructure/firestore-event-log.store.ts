import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { EventLogStorePort } from '../domain/ports/event-log-store.port';

const EVENTS = 'puzzle_events';

/**
 * `EventLogStorePort` implemented against `firebase-admin/firestore`.
 * The only writer of `puzzle_events` — Firestore Rules deny every
 * client write to this collection. `eventId` is Firestore's own
 * auto-generated document id (never caller-supplied); `timestamp` is
 * `FieldValue.serverTimestamp()`, not `new Date()` — the server's
 * clock, not whichever machine happened to invoke this.
 */
export function createEventLogStore(db: Firestore): EventLogStorePort {
  const collection = db.collection(EVENTS);

  return {
    async logEvent({ eventName, experienceId, actorRole, payload }) {
      await collection.add({
        eventName,
        experienceId,
        moduleType: 'puzzle',
        actorRole,
        timestamp: FieldValue.serverTimestamp(),
        payload: payload ?? {},
      });
    },
  };
}
