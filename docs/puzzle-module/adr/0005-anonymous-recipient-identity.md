# 0005. Anonymous, custom-claim-scoped Recipient identity — no login screen

## Status

Accepted (M4 Phase 1). Generalized (with an explicit "don't share it") in `PLATFORM-ARCHITECTURE.md` §3.

## Context

A Recipient opens a link a Creator sent them — often via WhatsApp or a text message — expecting to see a personal gift immediately. Requiring an account (email/password, or even a "continue with Google" step) before they can see anything would be actively hostile to that moment, and the PRD never asked for Recipient accounts to exist at all: there's no Recipient-facing feature (saved history, cross-device resume, notifications) that needs one. But `puzzle_progress` writes still need to be authenticated and scoped — an unauthenticated write path would mean anyone could write arbitrary progress for any experience.

## Decision

`resolveShareToken` mints a Firebase Auth **custom token** carrying one custom claim: `experienceId`, scoped to exactly the experience the share token resolved to. The client immediately and silently exchanges it for a session via `signInWithCustomToken` — the Recipient never sees an auth UI of any kind. Every subsequent gameplay call and every `puzzle_progress` Firestore Rule (`allow read: if request.auth.token.experienceId == experienceId`) checks that claim, not a Recipient-chosen identity.

## Consequences

- **Zero friction between "I got a link" and "I'm playing."** No sign-up form, no password to forget, matching the product's actual use case (a one-time, personal, often single-session experience).
- **A Recipient session is single-purpose by construction, not by convention.** The claim can't be used to read or write any experience other than the one it was minted for — verified against a real Auth-emulator token exchange, not just asserted against the Admin SDK's own return value (`gameplay-flow.emulator-test.ts`'s "rejects a stale recipient session").
- **No cross-device resume for a Recipient.** Reopening the same link on a different device mints a fresh anonymous session; progress is recovered because `puzzle_progress` is server-side and keyed by `experienceId` (not by the anonymous UID), not because the Recipient's identity persists — a deliberate, low-cost consequence given Recipients have no account to "log back into" regardless.
- **The Recipient's `experienceId` claim only proves session validity, not real-world identity.** Nothing here proves the Recipient is the person the Creator intended (anyone with the link can open it) — this was a known, accepted trade-off from the PRD, not a gap introduced here; the token's 192-bit entropy ([`token.service.ts`](../../../apps/puzzle-module/functions/src/infrastructure/token.service.ts)) is the actual defense against an unintended opener guessing a link.

## Alternatives considered

- **A shared platform-wide Recipient account**, so a Recipient's activity was visible/resumable across every module (relevant now that a platform is being planned, see `PLATFORM-ARCHITECTURE.md` §3). Explicitly rejected there too, not just here: a Recipient's puzzle-opening activity becoming visible to a hypothetical future Timeline Module (or vice versa) would be a privacy regression with no product benefit, since nothing asks for cross-module Recipient history.
