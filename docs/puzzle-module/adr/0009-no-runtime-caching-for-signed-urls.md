# 0009. PWA service worker caches the app shell only — never signed Storage URLs

## Status

Accepted (M5 Phase 2).

## Context

Adding a service worker (`@angular/service-worker`) for the "PWA-first" goal ([the M5 Performance pass](../../../apps/puzzle-module/README.md)) meant deciding what it caches. Angular's service worker supports `dataGroups` for caching runtime network responses (images, API calls), not just the static app shell (`assetGroups`). The Recipient's piece/reveal images are fetched from Firebase Storage via short-lived (15-minute) **signed URLs**, minted fresh by a Cloud Function ([ADR-0004](0004-server-authoritative-gameplay.md)) — each URL is uniquely signed and expires.

## Decision

`ngsw-config.json` defines only `assetGroups` (the app shell: `index.html`, the manifest, JS/CSS bundles) and a lazily-cached `assetGroups` entry for genuinely static assets (icons, fonts). **No `dataGroups` for anything Storage-derived.** The existing in-memory client-side cache (`PuzzleSessionFacade._pieceImages`, a plain Signal holding whatever URLs have been fetched this session) remains the only caching layer for piece/reveal images.

## Consequences

- **A stale signed URL can never be served from the service worker's cache.** If it could, a Recipient revisiting a page (or reloading after the service worker's cache populated) could be served a URL that's since expired — a broken image, or worse, a URL whose signature no longer matches what the current request would need. Caching only the app shell means every image fetch always goes through the live signing flow.
- **Every reveal/piece image is re-fetched from the network on a fresh page load**, even though the underlying Storage object hasn't changed — a deliberate cost. Mitigated by the in-memory cache covering the actual repeat-fetch case that matters (re-rendering the same unlocked piece multiple times within one session), and by the app shell being instantly available offline/on a repeat visit regardless.
- **Registration is deferred 30 seconds past app-stable** (`provideServiceWorker(..., { registrationStrategy: 'registerWhenStable:30000' })`) specifically so the service worker never competes with a Recipient's first paint for network/CPU — a related but separate decision, made alongside this one for the same "the Recipient's first few seconds matter most" reasoning.

## Alternatives considered

- **Cache signed URLs with a short TTL matching their own expiry.** Rejected as needless complexity for a property the browser's own HTTP cache headers (on the signed URL response itself) already handle correctly, if caching were wanted at all — and it isn't, for the staleness reason above; a URL that's still technically unexpired but was cached before a page reload would still be an unnecessary risk for zero measured benefit (the in-memory session cache already covers the case a runtime cache would help with).
