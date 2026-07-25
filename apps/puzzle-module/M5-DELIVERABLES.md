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
- **Low-end mobile devices**: **not verified on physical hardware** — no such device is available in this sandboxed environment; still called out as a pre-launch recommendation before a real production launch (see Known Limitations). A mobile-simulated **Lighthouse** audit *was* run (Final Pre-Launch Tasks, below) as the closest available proxy.

### Final Pre-Launch Lighthouse Audit

Run against a local production build (`ng build --configuration production`, served statically) with Chromium headless, `--form-factor=mobile --screenEmulation.mobile --throttling-method=simulate`, two routes: `/auth/login` (Creator entry) and `/e/:shareToken` (Recipient experience shell). Real physical-device hardware remains unavailable in this environment (see Known Limitations) — this is the closest available proxy, and per-finding results below were driven by actual audit output, not estimated.

Three real, fixable findings — all fixed and re-verified:

| Finding | Fix | Result |
|---|---|---|
| `meta-viewport`: `user-scalable=no`/`maximum-scale=1.0` disables pinch-zoom (WCAG 2.1 AA 1.4.4 violation) | Removed both from `index.html`'s viewport meta | Accessibility 94 → 100 |
| `robots-txt`: none existed | Added `src/robots.txt` (`Disallow: /e/` — recipient links are private capability URLs, never meant to be indexed), wired into `angular.json`'s `assets` with an explicit `output: "/"` so it lands at the site root, not `/assets/robots.txt` | SEO (login page) 91 → 100 |
| `valid-source-maps`: production build ships no source maps at all, so a production stack trace can never be mapped back to real source | Added `sourceMap: { scripts: true, hidden: true }` to the `production` build configuration — maps are generated but not referenced by a `//# sourceMappingURL` comment, so browsers never fetch them at runtime (zero cost to end users); they exist on disk for future upload to an error-tracking service | best-practices audit now clean |

Two findings investigated and confirmed **not real issues**, documented rather than "fixed":

- **Performance score ~55/100, FCP/LCP ~8–9s (both routes)**: verified via a controlled comparison — the identical build, served by the identical local test server, scored **100/100 with FCP/LCP of 0.8s** under `--throttling-method=provided` (no synthetic throttling) instead of `simulate`. The gap is Lighthouse's simulated mobile CPU/network throttling profile compounding with the crude local test server (no HTTP/2, no compression, no cache headers) used for this sandboxed test — not a real app regression. A real Firebase Hosting deployment has none of those server-side gaps; a genuine mobile-network/low-end-CPU verification still requires the physical-device pass called out as a pre-launch recommendation.
- **`is-crawlable` (SEO) scores 0 on the Recipient route** (`/e/:shareToken`, pulling that route's SEO category down to 63 vs. the login page's 100): Lighthouse is correctly detecting the `Disallow: /e/` line just added to `robots.txt`. This is the intended behavior, not a defect — recipient share links are personal, unlisted capability URLs that must never be indexed; a search engine successfully crawling one would be the actual bug.

The 782 KB `unused-javascript` finding (root-provided Firebase SDK modules — Auth/Firestore/Storage/Functions — loaded on every route regardless of which ones a given page uses) was reviewed and left as-is: an accepted architectural trade-off for a Firebase-heavy SPA where nearly every route needs 3+ of those modules, not a fixable inefficiency, and already implicitly covered by the bundle-size discussion above.

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
- [x] **Manual-trigger CD workflow** (`.github/workflows/puzzle-module-deploy.yml`, `workflow_dispatch`-only — never runs on push/PR) added, deploying via a service-account secret against real repository secrets. Still not automatic-on-merge by design (see Future Enhancement Recommendations #1).
- [x] **`build:deploy` secret-substitution step** added (`scripts/apply-prod-env.mjs` + `npm run build:deploy`) — reads `FIREBASE_API_KEY`/`FIREBASE_SENDER_ID`/`FIREBASE_APP_ID` from the environment (repository secrets in CI), substitutes them into `environment.prod.ts`, builds, then restores the placeholder file. `build:prod` (what CI's validation job runs) deliberately still builds against placeholders — it only needs to prove the app compiles, not that it's deployable.
- [x] Mobile-simulated Lighthouse audit run and real findings fixed (viewport zoom, `robots.txt`, hidden source maps) — see Performance Report above. Physical-device verification remains a known gap.
- [x] Rollback plan written (`DEPLOYMENT.md` → Rollback Plan) covering Hosting, Cloud Functions, and Firestore/Storage Rules independently.
- [ ] Custom monitoring/alerting policies — not configured (requires GCP Console setup against the deployed project).
- [ ] Client-side error monitoring (e.g. Sentry) — not integrated.
- [ ] Version tagging — both `package.json` files still read `0.1.0`; no git tags exist yet. Confirmed with the user: tag `puzzle-module-v1.0.0` after this PR merges to `main`, not on the still-open branch (see `DEPLOYMENT.md` → Version Tagging, and `RELEASE-NOTES-v1.0.0.md`).

## Known Limitations

1. **No automatic-on-merge CD** — deploys require someone to explicitly trigger `puzzle-module-deploy.yml` (`workflow_dispatch`) or run the manual CLI steps in `DEPLOYMENT.md`; nothing deploys just because a PR merged.
2. ~~No production secret-substitution mechanism~~ — resolved (Final Pre-Launch Tasks): `npm run build:deploy` (`scripts/apply-prod-env.mjs`) substitutes real secrets from the environment; the deploy workflow sources them from GitHub Actions repository secrets.
3. **Low-end mobile device performance** — a mobile-simulated Lighthouse audit was run and its real findings fixed (Final Pre-Launch Tasks; see Performance Report above), but **physical hardware verification is still not done** — recommended before a real launch.
4. **No custom monitoring/alerting** beyond Cloud Functions' automatic baseline logging/metrics.
5. **No client-side error monitoring** (Sentry, Crashlytics, or equivalent).
6. **Revealed clue TEXT doesn't survive a page reload** (pre-existing, documented since M4) — the clue counter still reflects real progress; only the text itself is session-local, by design (never re-sent by any server response).
7. **`resolveShareToken` has no dedicated rate limit** — defended instead by the share token's 192-bit entropy, a deliberate design choice, not an oversight, but worth re-evaluating if abuse is ever observed in production.
8. **The Publish & Share screen's "Share Stats" is still an honestly-labeled placeholder** ("coming soon," M3 Feature 5) — no real share-link engagement metrics are surfaced to Creators yet, despite `puzzle_events` now capturing the underlying data.
9. **Archived experiences' share links continue to resolve** — `resolveShareToken` doesn't check `status`, so an archived experience's old link still works exactly like a live one. This matches the original Cloud Function contract's spec (`TOKEN_NOT_FOUND` deliberately covers "invalid or expired" as one case), but is worth an explicit product decision if archival is ever meant to also revoke access.
10. **Versioning**: no releases have been tagged for this app yet.

## Future Enhancement Recommendations

1. **Automate the existing CD workflow on merge to `main`** — `puzzle-module-deploy.yml` already deploys correctly with real secrets, but only on manual `workflow_dispatch`; wiring it (or a variant of it) to run automatically post-merge, with appropriate approval gates, would close the last manual step.
2. **Physical low/mid-range Android device verification** — the mobile-simulated Lighthouse pass (Final Pre-Launch Tasks) is a proxy, not a substitute for real hardware, particularly for Time-to-Interactive under genuine CPU/network conditions.
3. **Custom monitoring & alerting** — Cloud Monitoring alert policies for elevated Cloud Function error rates or latency; a status/health dashboard.
4. **Client-side error monitoring** — Sentry or equivalent, to get visibility into failures that never reach the server (rendering errors, unhandled client exceptions).
5. **Real Share Stats** — `puzzle_events`' `recipient.link_opened`/`puzzle.completed` events already capture what's needed; build the aggregation + the Dashboard/Publish-screen UI to surface it, replacing the current placeholder.
6. **Explicit archived-link behavior** — a product decision on whether archiving an experience should also invalidate its share token, and if so, a distinct error code/message rather than folding it into `TOKEN_NOT_FOUND`.
7. **Defense-in-depth rate limiting on `resolveShareToken`** — currently relies solely on token entropy; an additional per-IP or per-token rate limit would be a reasonable hardening step if usage patterns ever suggest it's warranted.
8. **Version tagging and a CHANGELOG** — once the first real deploy happens, start tagging releases (`puzzle-module-vX.Y.Z`) and keeping a changelog for this app specifically, independent of the monorepo's other apps.
