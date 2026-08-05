# 0004. Server-authoritative gameplay — never trust the client for correctness

## Status

Accepted (Module Contract §8, predates this codebase; enforced throughout M2–M4). The single most load-bearing security decision in the product.

## Context

The core mechanic — a Recipient answers a memory-based question to unlock a piece of a photo — has an obvious, tempting shortcut: ship the correct answers and the full reveal image to the client up front, and just hide the UI until the Recipient "earns" it. That shortcut is trivially defeated by anyone who opens their browser's dev tools, and it directly undermines the product's entire value proposition (a gift whose reveal is *earned*, not just visually delayed).

## Decision

- The Recipient's client is **never given** a `correctAnswer`, a `clues` array, or the full-resolution reveal image before it's actually earned. `resolveShareToken`'s response type (`RecipientQuestionView { questionId, prompt }`, `domain/models/question.model.ts`) is structurally incapable of carrying a correct answer — not filtered out at serialization time, but a type that never had the field to begin with, so a future refactor can't accidentally reintroduce the leak.
- Every gameplay decision — is this answer correct, is a clue available, does partner-help apply, what's the current score — is made by a real Cloud Function (`submitAnswer`, `requestClue`, `requestPartnerHelpReveal`, `getCompletionSummary`) reading `puzzle_experiences_private` via the Admin SDK, never by client-side logic reading data it was handed.
- Gated images (piece slices, the full reveal) exist only as separate Storage objects, served via short-lived (15-minute) **signed URLs** minted by a Cloud Function only after the server has confirmed the gating condition is met — never via a Storage Rules grant a client could exploit by guessing a path.
- Firestore write access to the score/progress collection (`puzzle_progress`) is `allow write: if false` for every client — the only writer is the Admin SDK, inside a Cloud Function, inside a transaction.

## Consequences

- **A Recipient's browser genuinely cannot cheat**, confirmed at three independent layers: the type system (can't even hold a correct answer), Firestore Rules (can't write progress directly), and Storage Rules (can't read a gated image without a signed URL) — verified by dedicated emulator tests at the Rules layer specifically (`storage-rules.emulator-test.ts`'s "even the owning creator" case), not just by application code being careful.
- **The Creator's own Preview needed a deliberately separate, local-only implementation** (`domain/rules/gameplay.rules.ts`, `application/creator/puzzle-preview.facade.ts`) rather than reusing the real Recipient path, specifically because a Creator previewing their *own* authored puzzle already knows the answers — there's no boundary to protect there, and forcing Preview through the same server round-trips would have added latency and Cloud Functions cost for a case with no security benefit (documented explicitly in that facade's own doc comment).
- **Every gameplay Cloud Function call is a real network round trip**, with real latency and real cost per Recipient action — accepted as the necessary price of the guarantee above; mitigated, not eliminated, by an explicit 20-second timeout (down from Firebase's 70-second default) so a slow connection fails visibly rather than hanging (M5 Phase 5).

## Alternatives considered

- **Client-side correctness checks against server-provided answer hashes** (e.g., ship a hash of the correct answer, compare client-side). Rejected — a hash of a short, guessable answer (a name, a place) is crackable offline in seconds; this would have been security theater, not a real boundary.
