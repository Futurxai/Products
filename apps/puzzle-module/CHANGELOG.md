# Changelog — Puzzle Module

All notable changes to this app are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/); versioning follows semver, tagged as `puzzle-module-vX.Y.Z` (prefixed, not a bare `vX.Y.Z`, since this is one app in a monorepo with its own release cadence — see `DEPLOYMENT.md` → Version Tagging).

## [1.0.0] — Unreleased (tag created post-merge, see `DEPLOYMENT.md` → Version Tagging)

First full-featured release of the Puzzle Module — a personalized 3×3 photo-jigsaw gifting experience for the Love Digitally platform. Covers the complete Creator-to-Recipient product loop: milestones M0 through M5, plus a Final Pre-Launch hardening pass. Full detail in `RELEASE-NOTES-v1.0.0.md`; per-milestone technical detail in `README.md`.

### Added

- **Creator flow**: email/Google authentication, Dashboard with live status/analytics, a 6-step authoring Wizard (occasion & emotion, image upload with in-app crop, recipient details, 9 questions with up to 3 clues each, completion details, review), self-serve Preview, Publish & Share (live link, QR code, WhatsApp/native share).
- **Recipient flow**: token-based share links (no account required) — Welcome screen, locked 3×3 puzzle board, sequential clues, "Ask Your Partner" WhatsApp fallback, real-time progress and scoring, star-rated final reveal.
- **7 Cloud Functions** (`publishExperience`, `resolveShareToken`, `submitAnswer`, `requestClue`, `requestPartnerHelpReveal`, `getCompletionSummary`, `logRecipientEvent`) and a reveal-image-slicing Storage trigger — all gameplay-critical decisions (correctness, scoring, clue/partner-help reveal) are server-authoritative.
- **Analytics**: every recipient-facing event from the product requirements logged server-side, write-only from the client (`puzzle_events`, see ADR-0008).
- **PWA support**: service worker, branded manifest and icon set, production-only registration.
- **WCAG 2.1 AA accessibility**: computed contrast-ratio audit and fixes across brand-color/text pairings, `aria-required` on shared form primitives, full reduced-motion coverage.
- **Security hardening**: dedicated Firestore/Storage Rules emulator test coverage (previously untested collections and Storage Rules), confirming Cloud Function authorization, anonymous auth scoping, token handling, signed URL expiry, and rate limiting.
- **Production deployment path**: `workflow_dispatch`-only GitHub Actions deploy workflow (`.github/workflows/puzzle-module-deploy.yml`), a real secret-substitution build (`npm run build:deploy` / `scripts/apply-prod-env.mjs`), and a documented manual-CLI fallback.
- **End-to-end UAT** (`e2e/creator-to-recipient.spec.ts`, Playwright against real Firebase emulators) covering the full Creator-to-Recipient journey.
- **Documentation**: `README.md`, `DEPLOYMENT.md`, `RUNBOOK.md`, `ONBOARDING.md`, `USER-GUIDE.md`, `RELEASE-NOTES-v1.0.0.md`, `M5-DELIVERABLES.md`, `CLOUD-FUNCTIONS-API.md`, `PLATFORM-ARCHITECTURE.md`, and 10 architecture decision records (`docs/puzzle-module/adr/`).

### Fixed

- **Recipients could not submit answers.** The question modal's `<form (ngSubmit)="onSubmit()">` was missing `FormsModule` in its component imports, so the native `submit` event had no listener — clicking "Submit answer" (or pressing Enter) silently did nothing. Fixed in both the Recipient's question modal and its structural twin in the Creator's Preview flow, with regression-guard tests added that dispatch a real DOM submit event.
- **Creators could not start a puzzle.** Creating a new draft wrote two Firestore documents in one atomic batch; the private document's security rule establishes ownership by reading the public document, but a batch evaluates all writes against pre-batch state, so the write was denied every time. Fixed by splitting into two sequential, awaited writes.
- Three Lighthouse findings from the Final Pre-Launch mobile-simulated audit: pinch-zoom disabled via viewport meta (WCAG 1.4.4 violation), missing `robots.txt`, no source maps shipped for production stack-trace mapping.
- An N+1 Firestore read in the Dashboard's `listByCreator`.

### Known limitations

See `M5-DELIVERABLES.md` → Known Limitations and `RELEASE-NOTES-v1.0.0.md` → Known Limitations for the full list (no automatic-on-merge CD, no physical-device performance verification, no custom monitoring/alerting, no client-side error monitoring, no Firestore backups/PITR, Share Stats still a placeholder, revealed clue text is session-local by design).
