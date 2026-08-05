# Production Verification Checklist — Puzzle Module v1.0.0

Run this against the **live deployed environment** (the real Hosting URL, real Cloud Functions, real Firestore/Storage) after a production deploy — not the emulator. This is the manual, admin-runnable companion to the automated end-to-end UAT (`e2e/creator-to-recipient.spec.ts`), which covers the same journey against emulators as part of every release's Release Checklist. Run this checklist once per production deploy; treat any unchecked item as a blocker to resolve or explicitly accept before calling the deploy verified.

Prerequisite: complete `DEPLOYMENT.md` → "Verifying deployment success" first (Hosting live, Functions deployed to `asia-south1`, Rules timestamp current) before starting this checklist.

## 1. Creator flow

- [ ] Sign up with a new test account (email/password) succeeds and lands on the Dashboard.
- [ ] Sign in with Google succeeds (requires Google Authentication enabled — see `DEPLOYMENT.md` → One-Time Firebase Project Setup). If Google sign-in is not yet enabled on this project, confirm this is a known, accepted gap rather than a silent failure.
- [ ] Sign out and sign back in with the same account — session state is correctly restored.
- [ ] Dashboard loads with correct empty state for a brand-new account (no experiences yet).
- [ ] Forgot-password flow sends a real reset email (check the inbox of a real test address, not just that the UI shows a success toast).

## 2. Publish flow

- [ ] Complete the 6-step Wizard end-to-end: occasion & emotion, image upload with crop, recipient details, all 9 questions with at least one clue each, completion details, review.
- [ ] Image upload succeeds against real Firebase Storage (not a mock) — confirm the uploaded original appears in Storage under the expected creator-scoped path.
- [ ] Preview plays the exact draft content before publishing (spot-check at least 2 of the 9 questions and the completion message).
- [ ] Publish succeeds — the Cloud Function `publishExperience` returns success, and the experience's `status` transitions to published in Firestore (Console spot-check, not just UI state).
- [ ] The reveal-image Storage trigger fires and produces the sliced piece images (Console spot-check of the Storage bucket for the new experience's slice paths).
- [ ] Dashboard reflects the new experience with correct status/summary after publishing.

## 3. Share link

- [ ] Copy Link button produces a working `/e/:shareToken` URL.
- [ ] QR code renders and, when scanned with a real phone camera, opens the correct link.
- [ ] WhatsApp share opens WhatsApp (or its web fallback) with the link pre-filled.
- [ ] Native Share (mobile) opens the OS share sheet with the correct link.
- [ ] The share link works in an incognito/private browser window with no prior session — confirms no reliance on the Creator's own auth state.

## 4. Recipient flow

- [ ] Opening the share link mints a Firebase Anonymous Auth session silently — no login screen is ever shown to the Recipient.
- [ ] Welcome screen shows the correct recipient display name and occasion/emotion framing.
- [ ] The 3×3 puzzle board renders locked, with the correct pattern/placeholder image (never the real reveal image before it's earned).
- [ ] Reloading mid-session restores progress correctly (locked/unlocked pieces, score, clue-usage counters — not the revealed clue text itself, which is session-local by design).
- [ ] An invalid or expired share token shows a clear, honest error state — never a blank screen or a raw error.

## 5. Puzzle completion

- [ ] Answering a question correctly on the first try unlocks the corresponding piece and awards full points.
- [ ] Answering incorrectly, then requesting a clue, then answering correctly awards the correct reduced point value.
- [ ] Requesting "Ask Your Partner" opens the WhatsApp fallback with the configured challenge text, and using the partner-help reveal awards the correct (lowest-tier) point value.
- [ ] Rate limiting on repeated wrong answers triggers as expected (`RATE_LIMITED`) — verify this doesn't block a legitimate slow player, only rapid resubmission.
- [ ] Completing all 9 pieces triggers the final reveal animation, shows the full-resolution reveal image (only after genuinely earned — confirm via Storage signed URL, not a client-side reveal), and displays the correct star rating for the achieved score.
- [ ] `getCompletionSummary` returns the correct final score/star rating matching what the client displayed during play.

## 6. Analytics

- [ ] For a full play-through, confirm (via Cloud Logging or a direct Firestore Console read of `puzzle_events`) that the expected event sequence was written server-side: link opened, each question answered (correct/incorrect), each clue used, each piece unlocked, puzzle completed.
- [ ] Confirm no event was ever written by a client-side `addDoc()` — every `puzzle_events` document should trace to a Cloud Function write (per ADR-0008, `puzzle_events` is `allow write: if false` for all clients).
- [ ] Spot-check that no answer text, correct-answer content, or share token appears in any logged event payload (per the Logging Review in `DEPLOYMENT.md`).

## 7. Authentication

- [ ] Creator email/password and Google auth both issue valid sessions recognized by Firestore Rules (a signed-in Creator can read/write only their own experiences — spot-check by attempting, and confirming denial of, access to another test account's experience via direct Firestore console query if feasible).
- [ ] Recipient anonymous sessions are correctly scoped to one experience via the `experienceId` custom claim — confirm a Recipient session from one share link cannot read another experience's private data.
- [ ] Auth tokens are not logged anywhere client- or server-side.

## 8. Cloud Functions

- [ ] All 7 callables (`publishExperience`, `resolveShareToken`, `submitAnswer`, `requestClue`, `requestPartnerHelpReveal`, `getCompletionSummary`, `logRecipientEvent`) are deployed and reachable at `asia-south1` (Console → Functions → confirm region per function).
- [ ] The reveal-image-slicing Storage trigger fires reliably (re-confirm from §2 above, at least once more from a second, independently-published test experience).
- [ ] Structured JSON logs are visible in Cloud Logging for a full test play-through, with consistent `functionName`/`experienceId` fields (see `RUNBOOK.md` §2 for the exact query patterns).
- [ ] No `severity="ERROR"` log lines were produced during this checklist's own test run (`severity="WARNING"` domain rejections from deliberately-triggered test cases, e.g. a wrong answer, are expected and fine).

## 9. Firestore

- [ ] `puzzle_experiences` and `puzzle_experiences_private` documents are correctly split (public vs. owner-only fields) for the test experience created in §2 — spot-check via Console that no private-only field (`shareTokenHash`, `questions`, `revealImagePath`) leaked into the public document.
- [ ] Firestore Rules are enforcing as expected: a Recipient client cannot write to `puzzle_events`; a Creator cannot edit an experience once a Recipient has started (Business Rule #10).
- [ ] Composite indexes required by the Dashboard's `listByCreator` query and any other production query are present (no "missing index" errors in the browser console or Cloud Logging during this checklist's run).

## 10. Storage

- [ ] The original uploaded reveal image is stored under the expected creator-scoped path and is not publicly readable (Rules spot-check: attempt an unauthenticated fetch of the raw object path and confirm it's denied).
- [ ] Individual piece slices and the full reveal image are only accessible via short-lived signed URLs minted after being earned — confirm a signed URL from one completed piece expires and stops working after its documented window (15 minutes).
- [ ] Public pattern art (the locked-board placeholder image) is readable by anyone, writable by none.

## 11. Hosting

- [ ] The live Hosting URL serves the production build (confirm via browser dev tools that `useEmulators` is `false` and no emulator connection is attempted).
- [ ] The PWA service worker registers correctly (production-only, ~30s after app-stable) and the manifest/icons are branded correctly, not the default Angular placeholders.
- [ ] `robots.txt` is served at the site root and correctly disallows `/e/` (Recipient links must never be indexed).
- [ ] No console errors on initial load of both the Creator entry route and a real `/e/:shareToken` route.
- [ ] Confirm the previous Hosting release ID was noted before this deploy (per the Release Checklist), so a rollback target is known without having to look it up under pressure.

## Sign-off

- [ ] All sections above checked, or any unchecked item explicitly accepted as a known gap (cross-reference `M5-DELIVERABLES.md` → Known Limitations / `RUNBOOK.md` if it's an already-documented one; flag anything new).
- [ ] Verifier name/date recorded (in the deploy's tracking issue/PR, or wherever this repository tracks release sign-off).
