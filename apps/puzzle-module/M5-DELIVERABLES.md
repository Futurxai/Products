# M5 — Analytics, Polish & Launch Preparation: Deliverables

Compiled at the end of M5 (Phases 1–7), per the milestone's closing request. Full technical detail for every item below lives in `README.md`'s per-phase sections (linked); this document is the consolidated summary.

## Performance Report

See `README.md` → Performance (M5, Phase 2).

- **Bundle size**: production build — 1.34 MB raw / ~292 KB estimated transfer initial load, within the existing 1.35 MB / 1.6 MB budget. Every Firebase SDK and Ionic import already tree-shaken (modular imports throughout, confirmed by audit).
- **Lazy loading**: already correct since M3/M4 — every route loads its page via `loadComponent()`; verified, not changed.
- **PWA caching**: the one real gap — no service worker existed despite "PWA-first" being a stated goal since M0. Added `@angular/service-worker`, a branded manifest + icon set, production-only registration deferred 30s past app-stable. Deliberately no runtime data caching (Storage signed URLs expire and must never be served stale).
- **Firebase reads**: fixed an N+1 read in the Dashboard's `listByCreator` (was fetching every experience's unused private doc — 1 query + N reads → 1 query, 0 extra reads).
- **Signal recomputation**: one hoisted computed signal in the Puzzle Board (was re-reading/re-concatenating a shared value once per locked tile per change-detection run).
- **Animation performance**: every animation already compositor-friendly (`opacity`/`transform` only); reduced-motion coverage completed to 100% (two components were missing it).
- **Low-end mobile devices**: **not verified on physical hardware or with Lighthouse/CPU-throttling tooling** — neither is available in the sandboxed environment this work was done in. What IS verified (transfer size, animation choice, service-worker caching) is documented as a proxy, and a real device/Lighthouse pass is called out explicitly as a pre-launch recommendation, not silently skipped or fabricated.

## Accessibility Report

See `README.md` → Accessibility (M5, Phase 3).

- **Color contrast — the real finding.** A computed WCAG relative-luminance audit (actual math, not eyeballing) of every brand-color/text pairing found several real AA failures, all traced to one root cause: a single design-system token reused across backgrounds with genuinely different contrast needs (a solid brand-color surface vs. a barely-tinted chip vs. the plain page background). Fixed:
  - Secondary button (white on solid periwinkle): failed **both** themes (3.52:1 light / 2.48:1 dark).
  - Primary button / Stepper completed-step / success toast (shared token): failed light theme (3.70:1).
  - Info & success Dashboard badges: failed **dark theme specifically** (1.29:1 / 1.33:1 — effectively invisible).
  - Danger button / error toast: failed dark theme (2.39:1).
  - Ghost buttons (Wizard "Back", etc.): failed light theme (2.03:1).
  All fixed with purpose-specific tokens tuned against each control's real background, verified ≥4.5:1 in both themes before landing.
- **Screen reader support**: added `aria-required` to the two shared form primitives (`InputComponent`/`TextareaComponent`) — the required-field asterisk was previously visual-only.
- **Keyboard navigation, focus management, touch target sizing**: audited across the whole app (not just M4's Recipient flow) and found already correct — no non-semantic clickable elements, `ion-modal`'s focus trap never disabled, no target smaller than a comfortable tap size.
- **Reduced motion**: closed to 100% coverage as part of the Phase 2 animation-performance pass.

## Security Review Summary

See `README.md` → Security Review (M5, Phase 6).

- **The rules themselves (`firestore.rules`, `storage.rules`) were already correct** — this review found a **test-coverage** gap, not a rules gap.
- **Firestore Rules**: `puzzle_events` and `puzzle_creators` had zero automated verification against the real emulator, and Business Rule #10 (editing blocked once a recipient has started) had never been exercised despite being enforced in the deployed rules. All three now have dedicated emulator tests.
- **Storage Rules**: had **zero automated coverage at all**. New `storage-rules.emulator-test.ts` now verifies: public pattern art is read-only-by-anyone/write-by-none; a creator can upload/read only their own `reveal-image-original`, never another creator's; disallowed content types and oversized files are rejected even for the owner; and — the security-critical case — the server-generated full reveal image and piece slices are unreadable by anyone (including the owning creator) except via a signed URL, confirmed at the Rules layer itself.
- **Cloud Function authorization, anonymous authentication, token handling, signed URL expiry (15 min), and rate limiting**: all audited and confirmed already solid (ownership checks tested at both unit and real-emulator level; share tokens are 192-bit cryptographically random with only a hash persisted; no sensitive data ever logged).

## Production Readiness Checklist

See `DEPLOYMENT.md` for the actionable, step-by-step version of this. Status as of the end of M5:

- [x] CI validates every push/PR (lint, unit tests, production build, real-emulator integration tests).
- [x] Structured JSON logging on every Cloud Function, integrates with Cloud Logging/Monitoring automatically once deployed.
- [x] Logging reviewed — no sensitive data (answers, tokens) ever logged, server or client.
- [x] Deployment guide and release checklist written (`DEPLOYMENT.md` — did not exist before this phase).
- [x] `firebase.json`/`.firebaserc` already correctly configured (Hosting target, Rules paths, Functions codebase, emulator ports).
- [ ] **CI has no deploy step** — deployment is a manual, now-documented process, not an automated one. Adding real CD (with real secrets) is a decision for the user to make, not something to build unprompted.
- [ ] **`build:prod` has no secret-substitution step** — a CI-produced build ships placeholder Firebase config (`__LOVEDIGITALLY_APP_WEB_API_KEY__` etc.) and is not actually deployable as-is. Must be resolved (real secrets + an injection mechanism) before a real deploy.
- [ ] Custom monitoring/alerting policies — not configured (requires GCP Console setup against the deployed project).
- [ ] Client-side error monitoring (e.g. Sentry) — not integrated.
- [ ] Version tagging — both `package.json` files still read `0.1.0`; no git tags exist. Recommended (`1.0.0`, tag `puzzle-module-v1.0.0`) once this work actually merges and deploys, not preemptively.

## Known Limitations

1. **No CD pipeline** — every deploy is manual, following `DEPLOYMENT.md`.
2. **No production secret-substitution mechanism** — `environment.prod.ts`'s placeholders must be replaced by hand or via a not-yet-built build step before any real deploy.
3. **Low-end mobile device performance** — not verified on physical hardware or with Lighthouse; recommended before launch.
4. **No custom monitoring/alerting** beyond Cloud Functions' automatic baseline logging/metrics.
5. **No client-side error monitoring** (Sentry, Crashlytics, or equivalent).
6. **Revealed clue TEXT doesn't survive a page reload** (pre-existing, documented since M4) — the clue counter still reflects real progress; only the text itself is session-local, by design (never re-sent by any server response).
7. **`resolveShareToken` has no dedicated rate limit** — defended instead by the share token's 192-bit entropy, a deliberate design choice, not an oversight, but worth re-evaluating if abuse is ever observed in production.
8. **The Publish & Share screen's "Share Stats" is still an honestly-labeled placeholder** ("coming soon," M3 Feature 5) — no real share-link engagement metrics are surfaced to Creators yet, despite `puzzle_events` now capturing the underlying data.
9. **Archived experiences' share links continue to resolve** — `resolveShareToken` doesn't check `status`, so an archived experience's old link still works exactly like a live one. This matches the original Cloud Function contract's spec (`TOKEN_NOT_FOUND` deliberately covers "invalid or expired" as one case), but is worth an explicit product decision if archival is ever meant to also revoke access.
10. **Versioning**: no releases have been tagged for this app yet.

## Future Enhancement Recommendations

1. **Build a real CD pipeline** — automated deploy on merge to `main`, with secrets sourced from a proper secret manager (GitHub Actions secrets, Google Secret Manager, etc.), replacing the current fully-manual `DEPLOYMENT.md` process.
2. **Real device / Lighthouse performance verification** — a mobile-throttled Lighthouse run (or a physical low/mid-range Android device) against the deployed Hosting URL, particularly for Time-to-Interactive.
3. **Custom monitoring & alerting** — Cloud Monitoring alert policies for elevated Cloud Function error rates or latency; a status/health dashboard.
4. **Client-side error monitoring** — Sentry or equivalent, to get visibility into failures that never reach the server (rendering errors, unhandled client exceptions).
5. **Real Share Stats** — `puzzle_events`' `recipient.link_opened`/`puzzle.completed` events already capture what's needed; build the aggregation + the Dashboard/Publish-screen UI to surface it, replacing the current placeholder.
6. **Explicit archived-link behavior** — a product decision on whether archiving an experience should also invalidate its share token, and if so, a distinct error code/message rather than folding it into `TOKEN_NOT_FOUND`.
7. **Defense-in-depth rate limiting on `resolveShareToken`** — currently relies solely on token entropy; an additional per-IP or per-token rate limit would be a reasonable hardening step if usage patterns ever suggest it's warranted.
8. **Version tagging and a CHANGELOG** — once the first real deploy happens, start tagging releases (`puzzle-module-vX.Y.Z`) and keeping a changelog for this app specifically, independent of the monorepo's other apps.
