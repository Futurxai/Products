# Puzzle Module — Cloud Functions API Reference

Seven callable Cloud Functions, all deployed to **`asia-south1`** (never the Firebase default `us-central1` — a client calling without specifying this region will resolve against a deployment that doesn't exist), all invoked via the Firebase **Callable Functions** protocol (`httpsCallable`), not raw HTTP. Source: `functions/src/callable/*.callable.ts`; the shared request/response envelope machinery is `functions/src/callable/define-callable.ts`; the canonical client-facing response types are `src/app/domain/ports/puzzle-api.port.ts` (Angular app — the six gameplay/publish/resolve functions only; `logRecipientEvent` returns `void` to the client by design, see its own section).

## Conventions

### Two failure channels — do not conflate them

Every callable can fail in two structurally different ways, and callers must handle them differently:

1. **Transport-level failure** — malformed input (fails Zod schema validation), missing/wrong authentication, or a genuine infrastructure error (Firestore unavailable, an unhandled bug). These **reject the Promise** as a Firebase `HttpsError`, with one of the standard Firebase error codes below. Never business-meaningful — nothing in your product logic should special-case these beyond "something is actually broken."
2. **Business-rule failure** — a well-formed, properly-authenticated request that violates a domain rule (wrong answer, no clues left, experience not found, etc.). These **resolve normally** with `{ ok: false, error: <DomainErrorCode>, message: string, details?: object }`. This is the expected, common case for several of these functions (e.g. a wrong answer is not a bug) — always check `result.ok` before assuming success, never rely on a rejected promise to detect it.

Every successful response also carries `ok: true` alongside its function-specific fields, for a single discriminated-union shape client-side (`PuzzleApiPort`'s `*Result` types in the Angular app already model this).

### Transport-level (`HttpsError`) codes

| Code | When |
|---|---|
| `invalid-argument` | Request body fails Zod schema validation (see each function's Request section). Message lists the specific validation issues. |
| `unauthenticated` | No Firebase Auth session at all, on a function that requires one (every function except `resolveShareToken`). |
| `permission-denied` | Authenticated, but the session has no `experienceId` custom claim, on one of the four recipient-scoped functions. Practically: a Creator's own session calling a recipient function, or a malformed/tampered token. |
| `internal` | An unhandled exception inside the handler — a real bug or infra failure, not a business rule. Logged server-side with a stack trace (`functions/src/config/logger.ts`); never exposes internal details to the client. |

### Domain error codes (`ok: false` responses)

The one canonical list (`functions/src/domain/errors/domain-errors.ts`) — every function below states exactly which of these it can actually return; a function never returns a code not listed for it.

| Code | Meaning | Returned by |
|---|---|---|
| `TOKEN_NOT_FOUND` | The share token is invalid or expired. Deliberately the same code/message for both cases — see `docs/puzzle-module/test-data/09-cloud-function-examples.md`'s original intent, not two separate states. | `resolveShareToken` |
| `EXPERIENCE_NOT_FOUND` | No experience exists with the given id (or, for the recipient-scoped functions, the id from the caller's own session claim). | `publishExperience`, `submitAnswer`, `requestClue`, `requestPartnerHelpReveal`, `getCompletionSummary` |
| `UNAUTHORIZED` | The authenticated caller does not own the experience they're trying to act on. | `publishExperience` |
| `INCOMPLETE_EXPERIENCE` | The experience fails `canPublish()`'s validation (missing questions, no image, etc.) — `details.missingFields` lists exactly which, machine-readable field paths (e.g. `questions.q4.correctAnswer`). | `publishExperience` |
| `QUESTION_NOT_FOUND` | The `questionIndex` doesn't correspond to a real question on this experience. | `submitAnswer`, `requestClue`, `requestPartnerHelpReveal` |
| `ALREADY_UNLOCKED` | The question's piece is already unlocked — resubmitting an answer to it is rejected rather than silently re-scored. | `submitAnswer` |
| `RATE_LIMITED` | Too many incorrect attempts on this question in a short window. `details.questionId`. | `submitAnswer` |
| `NO_CLUES_REMAINING` | All 3 clues for this question have already been revealed. | `requestClue` |
| `CLUES_NOT_EXHAUSTED` | Partner-help was requested before this question's authored clues were all used. `details.cluesUsedSoFar`. | `requestPartnerHelpReveal` |
| `NOT_YET_COMPLETED` | Completion summary requested before all 9 pieces are unlocked. `details.piecesRemaining`. | `getCompletionSummary` |
| `EXPERIENCE_ALREADY_STARTED` | Reserved for a future edit/unpublish operation — **not currently thrown by any of the seven callables below.** Enforced today purely at the Firestore Rules layer (Business Rule #10: an experience with a `puzzle_progress` document can no longer have its public fields edited), verified by `functions/src/emulator-tests/security-rules.emulator-test.ts`, not by any Cloud Function. Listed here for completeness against the canonical error-code enum, not because a client should expect to see it from a callable today. |

### Auth models

| Model | Requirement | Used by |
|---|---|---|
| **Public** | No authentication at all. | `resolveShareToken` |
| **Creator** | A real, authenticated Firebase Auth session (`request.auth` present). Ownership of the *specific* experience being acted on is a separate business-rule check inside the handler (`UNAUTHORIZED` above), not enforced by the auth wrapper itself. | `publishExperience` |
| **Recipient** | An authenticated session whose ID token carries an `experienceId` custom claim — minted by `resolveShareToken`, never client-supplied. The claim, not any request field, determines which experience a call acts on; there is no `experienceId` parameter to spoof. | `submitAnswer`, `requestClue`, `requestPartnerHelpReveal`, `getCompletionSummary`, `logRecipientEvent` |

---

## `publishExperience`

**Auth**: Creator. **Schema**: `functions/src/schemas/publish-experience.schema.ts`.

Validates a draft experience is complete, generates a cryptographically random (192-bit) share token, persists only its SHA-256 hash, sets `status: 'published'` and `publishedAt`, and triggers the reveal-image slicing pipeline if not already run.

**Request**
```ts
{ experienceId: string }   // non-empty, trimmed
```

**Success response**
```ts
{
  ok: true;
  shareToken: string;   // the RAW token — exists only in this response and the resulting share URL, never persisted
  shareUrl: string;
  status: 'published';
}
```

**Errors**: `EXPERIENCE_NOT_FOUND`, `UNAUTHORIZED`, `INCOMPLETE_EXPERIENCE`.

---

## `resolveShareToken`

**Auth**: Public. **Schema**: `functions/src/schemas/resolve-share-token.schema.ts`.

The Recipient's entry point. Verifies the token's hash matches a published experience, mints a scoped anonymous Firebase Auth custom token (the `experienceId` claim every recipient-scoped function later relies on), and returns everything the Welcome/Board screens need — including question prompts (never answers/clues) and signed URLs for any pieces already unlocked (supports reopening a link mid-game).

**Request**
```ts
{ shareToken: string }   // min 8 chars
```

**Success response**
```ts
{
  ok: true;
  experienceId: string;
  customToken: string;   // pass to signInWithCustomToken; every later call authenticates via the resulting session
  publicMeta: {
    occasion: string;
    emotion: string;
    recipientDisplayName: string;
    welcomeNote: string;
    status: string;
    lockedPatternImageUrl: string;
    questions: { questionId: string; prompt: string }[];   // prompt-only — never correctAnswer/clues
    partnerHelpChallenge: string;
  };
  unlockedPieceImages: Record<string, string>;   // questionId -> signed URL, for pieces already unlocked
}
```

**Errors**: `TOKEN_NOT_FOUND` (covers both "invalid" and "expired" — one user-facing case, not two).

---

## `submitAnswer`

**Auth**: Recipient. **Schema**: `functions/src/schemas/submit-answer.schema.ts`. The single most central gameplay call — every correctness/scoring decision happens here, server-side, never client-side (Module Contract §8).

**Request**
```ts
{
  questionIndex: string;   // ^q[1-9]$
  answer: string;          // 1-500 chars, trimmed
}
```

**Success response — two shapes, discriminated by `correct`:**

Correct:
```ts
{
  ok: true;
  correct: true;
  questionIndex: string;
  cluesUsed: number;
  earnedVia: 'direct' | 'clue' | 'partner_help';
  pointsAwarded: number;              // 100 direct / 75|50|30 by clues used / 10 partner-help
  feedbackTier: 'youre_awesome' | 'nudge_to_remember' | 'teasing_inside_jokes';
  feedbackMessage: string;
  pieceImageUrl: string;              // signed URL, ~15 min expiry
  piecesUnlocked: number;
  piecesRemaining: number;
}
```

Incorrect:
```ts
{
  ok: true;
  correct: false;
  questionIndex: string;
  attemptNumber: number;
  clueAvailable: boolean;
  cluesUsedSoFar: number;
  partnerHelpAvailable?: boolean;
}
```

**Errors**: `EXPERIENCE_NOT_FOUND`, `QUESTION_NOT_FOUND`, `RATE_LIMITED`, `ALREADY_UNLOCKED`.

---

## `requestClue`

**Auth**: Recipient. **Schema**: `functions/src/schemas/request-clue.schema.ts`. Reveals the next clue in sequence (a question has up to 3, authored by the Creator — fewer if the Creator chose to author fewer).

**Request**
```ts
{ questionIndex: string }   // ^q[1-9]$
```

**Success response**
```ts
{
  ok: true;
  questionIndex: string;
  clueNumber: number;             // which clue this is (1, 2, or 3)
  clueText: string;
  clueNumbersRemaining: number;   // how many more this question has left to reveal
}
```

**Errors**: `EXPERIENCE_NOT_FOUND`, `QUESTION_NOT_FOUND`, `NO_CLUES_REMAINING`.

---

## `requestPartnerHelpReveal`

**Auth**: Recipient. **Schema**: `functions/src/schemas/request-partner-help-reveal.schema.ts`. Unlocks a piece without a correct answer, once all of that question's authored clues have been exhausted — the "Ask Your Partner" fallback.

**Request**
```ts
{ questionIndex: string }   // ^q[1-9]$
```

**Success response**
```ts
{
  ok: true;
  questionIndex: string;
  earnedVia: 'partner_help';
  pointsAwarded: number;          // flat 10, regardless of how many clues this question actually had
  feedbackTier: 'teasing_inside_jokes';
  feedbackMessage: string;
  pieceImageUrl: string;          // signed URL
  piecesUnlocked: number;
  piecesRemaining: number;
}
```

**Errors**: `EXPERIENCE_NOT_FOUND`, `QUESTION_NOT_FOUND`, `CLUES_NOT_EXHAUSTED`.

---

## `getCompletionSummary`

**Auth**: Recipient. **Schema**: `functions/src/schemas/get-completion-summary.schema.ts` — no fields at all; the experience is entirely determined by the caller's session claim.

**Request**
```ts
{}
```

**Success response**
```ts
{
  ok: true;
  finalScore: number;
  maxScore: number;              // 900
  starRating: 1 | 2 | 3;
  starLabel: string;             // e.g. "You know them by heart"
  completionMessage: string;     // Creator-authored
  finalRevealImageUrl: string;   // signed URL, full resolution
  perQuestionBreakdown: { questionIndex: string; earnedVia: 'direct' | 'clue' | 'partner_help'; pointsAwarded: number }[];
}
```

**Errors**: `EXPERIENCE_NOT_FOUND`, `NOT_YET_COMPLETED`.

---

## `logRecipientEvent`

**Auth**: Recipient. **Schema**: `functions/src/schemas/log-recipient-event.schema.ts`. The one purely-client-observable-moment logging path — see `docs/puzzle-module/adr/0008-write-only-analytics-collection.md` for why this exists as its own narrow callable instead of a generic "log an event" endpoint. Every other analytics event is a side effect of one of the six functions above, never logged through here.

**Request**
```ts
{ eventName: 'recipient.welcome_viewed' | 'celebration.viewed' }   // closed enum — no other value is accepted
```

**Success response**: `{ ok: true }` — no other fields. Analytics is best-effort server-side (a Firestore write failure here is logged and swallowed, never surfaced as a business rejection) — client code should treat this call as fire-and-forget and only handle a genuine transport-level rejection (e.g. offline), never build UI around its success payload.

**Errors**: none (this function cannot fail with a domain error — Zod validation is the only way to reject a request to it, since its allowlisted enum makes every well-formed request valid by construction).

---

## Not yet built

Nothing beyond the seven functions above exists. In particular: no update/unpublish/delete callable (an experience's public fields, once a recipient has started, are frozen at the Firestore Rules layer per Business Rule #10 — see `EXPERIENCE_ALREADY_STARTED` above — but there is currently no Cloud Function path to unpublish or delete an experience at all, published or not). If a future module needs an equivalent API surface, see `docs/puzzle-module/PLATFORM-ARCHITECTURE.md` for how the shared conventions here (region, callable protocol, `ok`-discriminated responses, the domain-error-code pattern) generalize.
