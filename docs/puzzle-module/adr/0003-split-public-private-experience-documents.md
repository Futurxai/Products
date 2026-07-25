# 0003. Split every `PuzzleExperience` across a public and a private Firestore document

## Status

Accepted (M2). Both the Admin SDK store (`functions/src/infrastructure/firestore-experience.store.ts`) and the client SDK repository (`src/app/infrastructure/firebase/firestore-experience.repository.ts`) implement this identical split — a real coupling to keep in sync if it ever changes (see that repository's own doc comment).

## Context

A `PuzzleExperience` has fields that must be readable by anyone with a share link before they've earned anything (`occasion`, `emotion`, `recipientDisplayName`, `status`) and fields that must never be readable by a Recipient at all, ever — `questions` (which includes `correctAnswer` and `clues`), `completionMessage`, `partnerHelpChallenge`, `revealImagePath`, `shareTokenHash`. Firestore Rules can restrict *who* reads a document, but not *which fields* within it — there's no field-level read security in Firestore.

## Decision

Split the entity across two documents at the same `experienceId`:

- **`puzzle_experiences/{id}`** — public. `allow read: if true` (`firestore.rules`). Only fields safe for anyone to read.
- **`puzzle_experiences_private/{id}`** — owner-only. `allow read: if request.auth.uid == <the public doc's creatorId>`. Everything sensitive.

The Recipient-facing Cloud Functions (`resolveShareToken`, `submitAnswer`, etc.) read the private document via the **Admin SDK**, which bypasses Rules entirely — that's the one and only place sensitive fields are legitimately read on a Recipient's behalf, and only the specific fields each function's response actually needs are ever projected out (see [ADR-0004](0004-server-authoritative-gameplay.md)).

## Consequences

- **The Rules layer alone is sufficient to prevent a Recipient's client from ever fetching `correctAnswer`/`clues` directly**, with no reliance on the Cloud Functions' own care being the only line of defense — a defense-in-depth property confirmed by dedicated Storage/Firestore Rules emulator tests (`functions/src/emulator-tests/security-rules.emulator-test.ts`), not just asserted.
- **Every write to an experience needs to know which document a field lives in.** `toPublicDoc`/`toPrivateDocForCreate`/`toPublicUpdateFields`/`toPrivateUpdateFields` (both the client repository and the Admin store) exist specifically to keep that mapping in one place rather than scattered across call sites.
- **Creating a new experience needs two documents, atomically-adjacent but not actually atomic** — see the client repository's `create()`, which does two sequential writes rather than one batch, specifically because the private document's create Rule reads the public document via `get()` and a batch evaluates both writes against the pre-batch database state (this exact bug was caught by the end-to-end UAT, see `README.md` → End-to-End UAT, and fixed after this ADR's original decision — the split itself wasn't wrong, the *write strategy* implementing it was).

## Alternatives considered

- **One document, Cloud-Functions-only writes for the sensitive fields, but still readable in full by anyone who can read the doc.** Rejected — this relies entirely on Rules never accidentally granting broader read access than intended, with no structural backstop; a single Rules bug would leak every correct answer for every published puzzle at once, rather than being caught by the narrower, easier-to-reason-about "does the private collection's rule correctly gate on ownership" question this split reduces the problem to.
