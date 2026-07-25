# Puzzle Module v1.0.0 — Release Notes

**Tag**: `puzzle-module-v1.0.0` (prefixed, not a bare `v1.0.0` — this is one app in a monorepo with its own release cadence). **Not yet tagged** — per the confirmed decision, the tag is created on the `main` merge commit once PR #6 actually merges, not on this feature branch. See `DEPLOYMENT.md` → Version Tagging.

**What this is**: the first full-featured release of the Puzzle Module — a personalized 3×3 photo-jigsaw gifting experience for the Love Digitally platform. A Creator authors nine memory-based questions gating a reveal image; a Recipient plays through a shared link with no account required. This release covers the complete Creator-to-Recipient product loop, milestone M0 through M5 plus a final pre-launch hardening pass.

## Highlights

- **Full Creator flow**: email/Google auth, a Dashboard with live status/analytics, a 6-step authoring Wizard (occasion & emotion, image upload with an in-app crop tool, recipient details, 9 questions with up to 3 clues each, completion details, review), a self-serve Preview that plays the draft exactly as a Recipient would, and Publish & Share (live link, QR code, WhatsApp/native share).
- **Full Recipient flow**: no login — a share link silently mints a scoped anonymous session. Welcome screen, a locked 3×3 puzzle board, sequential clues, an "Ask Your Partner" WhatsApp fallback, real-time progress and scoring, and a star-rated final reveal.
- **Server-authoritative gameplay throughout.** Correct answers, clue text, and the full-resolution reveal image are never sent to the Recipient's client before earned — every decision (correctness, scoring, clue reveal, partner-help reveal) is validated by a real Cloud Function, never checked locally.
- **Analytics**: every recipient-facing event from the product requirements is logged server-side, write-only from the client's perspective.
- **Production-ready deployment path**: a documented, checklist-driven deploy process (manual CLI or a `workflow_dispatch`-only GitHub Actions workflow), a rollback plan for each of the three independently-deployable pieces (Hosting, Functions, Rules), and a real secret-substitution mechanism for production Firebase config.
- **A real, browser-driven end-to-end UAT** (Playwright, against live Firebase emulators) covering the entire Creator-to-Recipient journey — which found and fixed two production-blocking bugs no other test layer in this project could have caught. See "Fixed in this release," below.

## Feature summary by milestone

- **M0** — project scaffold, Clean Architecture skeleton, CI.
- **M1** — the framework-free domain layer (models, business rules, ports).
- **M2** — all 7 Cloud Functions (`publishExperience`, `resolveShareToken`, `submitAnswer`, `requestClue`, `requestPartnerHelpReveal`, `getCompletionSummary`, `logRecipientEvent`) plus the reveal-image-slicing Storage trigger, and the Firestore/Storage security rules.
- **M3** — the full Creator experience: Authentication, Dashboard, Creation Wizard, Preview, Publish & Share.
- **M4** — the full Recipient experience: Entry, Welcome, Puzzle Board, Progress, Clues, Partner Help, Completion.
- **M5** — Analytics, Performance, Accessibility (WCAG 2.1 AA), Responsive Design, Error Recovery, Security Review, Production Readiness.
- **Final Pre-Launch Tasks** (this release) — production secrets pipeline, a mobile-simulated Lighthouse audit pass, the end-to-end UAT, a rollback plan and release checklist, and this document.

Full technical detail for every item above lives in `README.md`, organized by the same milestone structure.

## Fixed in this release

Found by the new end-to-end UAT (`e2e/creator-to-recipient.spec.ts`), which is the first test in this project to drive a real browser against real Firebase emulators through the complete loop:

1. **The Recipient could never actually submit an answer.** The question modal's `<form (ngSubmit)="onSubmit()">` was missing `FormsModule` in its component imports, so nothing was listening for the native `submit` event — clicking "Submit answer" (or pressing Enter) silently did nothing, for every real user, since the component was built. The Karma unit test for this component had been green throughout because it called the handler method directly instead of exercising the DOM. Fixed in both the Recipient's question modal and its structural twin in the Creator's Preview flow; both specs gained a regression-guard test that dispatches a real DOM submit event.
2. **A real Creator could never start a puzzle.** Creating a new draft wrote two Firestore documents (public and private) in one atomic batch; the private document's security rule establishes ownership by reading the public document, but a batch evaluates all its writes against the pre-batch database state — so the public document didn't exist yet when the rule ran, and the batch was denied every time. This was invisible to the Cloud Functions emulator tests (which use the Admin SDK and bypass security rules) and to the mocked unit tests. Fixed by splitting the write into two sequential, awaited writes.

Neither bug affected anything already covered by this project's 550 Karma specs, 171 Cloud Functions unit specs, or 46 real-emulator Firestore/Auth/Storage tests — all of which continued passing throughout. They were only reachable by driving a real browser against real security rules together, which is exactly the gap this release's UAT was built to close.

## Known limitations

Carried forward from M5 and this release's own findings — none are silent gaps, all are documented in detail in `M5-DELIVERABLES.md` and `DEPLOYMENT.md`:

- No CD pipeline runs automatically on merge — every deploy is a manual trigger (`workflow_dispatch` or the documented CLI steps).
- No physical-device performance verification — the mobile-simulated Lighthouse audit is the closest available proxy in this environment.
- No custom Cloud Monitoring alerting or client-side error monitoring (e.g. Sentry) configured yet.
- No Firestore point-in-time recovery / scheduled backups configured — a bad write has no automated rollback path (see `DEPLOYMENT.md`'s Rollback Plan).
- The end-to-end UAT is not wired into CI (needs a real Chromium binary and ~45s of browser automation) — run it manually before a release.
- Share Stats on the Publish screen remains an honestly-labeled "coming soon" placeholder.
- Revealed clue text does not survive a page reload (progress and the clue counter do; only the text itself is session-local, by design).

## Upgrade / deployment notes

This is the first release — there is no prior deployed version to migrate from. Follow `DEPLOYMENT.md`'s Release Checklist for the first deploy: real Firebase secrets via `npm run build:deploy`, the Rules → Functions → Hosting deploy order, and a post-deploy smoke test (including a run of the UAT flow against the real deployed environment, not just the emulator).

## What's next

See the Platform Planning design document (in progress) for how this module integrates into the broader Love Digitally platform, and `M5-DELIVERABLES.md`'s Future Enhancement Recommendations for the specific next steps (automated CD, physical-device performance verification, monitoring/alerting, client error tracking, real Share Stats, defense-in-depth rate limiting).
