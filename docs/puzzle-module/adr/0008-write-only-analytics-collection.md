# 0008. Analytics as a write-only-from-Cloud-Functions Firestore collection

## Status

Accepted (M5 Phase 1). Generalized as the platform's analytics convention in `PLATFORM-ARCHITECTURE.md` §5, and as the pattern the proposed `platform_experiences` collection reuses (`PLATFORM-ARCHITECTURE.md` §4).

## Context

The PRD required logging a fixed set of recipient-facing moments (link opened, question answered, clue used, piece unlocked, puzzle completed, etc.) for a Creator to eventually see insight into how their gift was experienced. The obvious client-side approach — the Recipient's browser calls `addDoc()` directly against an events collection — would let a Recipient's client write an arbitrary event, with an arbitrary payload, at will: nothing stops a malicious or just-buggy client from claiming `puzzle.completed` with a fabricated score, or writing thousands of junk events.

## Decision

`puzzle_events` is `allow write: if false` for every client, unconditionally (`firestore.rules`). Every event is written by a Cloud Function, via the Admin SDK, and is either:
- **A side effect of a Cloud Function that already authoritatively performs the real action** — `submitAnswer` logs `question.answered_correct`/`piece.unlocked` because it's the function that actually determined those things happened; nine of eleven requested event types are logged this way, adding zero new endpoints.
- **Routed through one narrow, allowlisted callable** (`logRecipientEvent`) for the two moments with no server action to hang off of (a screen being viewed). Its Zod schema allowlists a closed `z.enum([...])` of exactly two event names — not `z.string()` — so a Recipient can request logging of "I viewed the welcome screen," but structurally cannot request logging of "I completed the puzzle with score 900," even by crafting the request by hand.

## Consequences

- **A Recipient's client can influence *when* an allowlisted, low-stakes event fires, never *what* a consequential event says.** The event log is trustworthy for a Creator's Insights (never built yet, but the data is already safe to build it from) precisely because the client was never in a position to lie about anything that matters.
- **Zero duplicated business logic for the nine side-effect events.** Analytics correctness is inherited from the correctness of the function already being tested for its primary purpose, not verified separately.
- **`logRecipientEvent`'s allowlist must be extended deliberately, one enum value at a time, whenever a new purely-client-observable moment needs logging** — a small, known friction, accepted as the price of the guarantee above; extending a `z.string()` schema would be zero friction and also zero protection.
- **This exact shape was reused, not reinvented, for the platform-wide "what has this Creator made" index** proposed in `PLATFORM-ARCHITECTURE.md` §4 (`platform_experiences`) — the write-only-from-Cloud-Functions pattern generalizes cleanly to "a collection multiple readers trust without trusting the writer," which is a recurring shape, not a one-off.

## Alternatives considered

- **Client-side analytics SDK (e.g. Firebase Analytics/GA4) instead of a Firestore collection.** Considered and rejected for the *consequential* events specifically — a general analytics SDK is built for aggregate product metrics, not for data a Creator's own product feature (Insights) needs to read back per-experience with Firestore Rules-level access control; Firestore was the right tool because the read side needs per-document ownership checks a generic analytics pipeline doesn't provide.
