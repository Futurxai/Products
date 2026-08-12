/**
 * Operational configuration — deliberately NOT domain constants
 * (`domain/models/constants.ts`). These are abuse-prevention/deployment
 * knobs, tunable from real-world usage patterns, not rules of the
 * puzzle game itself; conflating the two would make "raise the rate
 * limit" require touching the same file as "change the scoring table."
 */

/**
 * Max `submitAnswer` attempts allowed per question before
 * `RateLimitedError`. Generous — this guards against scripted brute
 * force, not against a Recipient genuinely trying many real guesses.
 */
export const MAX_ANSWER_ATTEMPTS_PER_QUESTION = 20;

/**
 * Base URL for recipient share links. Real value is deployment
 * config, not a secret — set via `firebase functions:config:set` (or
 * the Functions v2 equivalent, environment variables in `.env.<project>`)
 * once the `puzzle-module` Hosting site's real domain is known. The
 * fallback here is a clearly-fake placeholder so a misconfigured
 * deploy fails obviously (a broken-looking link) rather than silently
 * pointing at the wrong place.
 */
export const SHARE_BASE_URL = process.env['SHARE_BASE_URL'] ?? 'https://puzzle-module.example.invalid/e';

/**
 * Explicit project/bucket identity, rather than letting
 * `onObjectFinalized` infer it from `GCLOUD_PROJECT`/`FIREBASE_CONFIG`
 * at module-load time. That inference only succeeds inside a real
 * Cloud Functions runtime or the emulator — importing this codebase
 * from a bare Node/Jasmine unit-test process (no live Firebase
 * context) throws immediately otherwise, which would mean nothing
 * that imports `index.ts`, even indirectly, could be unit-tested.
 * Pinning it explicitly makes the trigger's behavior identical in all
 * three contexts: unit test, emulator, and real deploy.
 */
export const FIREBASE_PROJECT_ID = process.env['GCLOUD_PROJECT'] ?? 'lovedigitally-puzzle';

/**
 * `lovedigitally-puzzle` is a project created after Firebase switched its
 * default bucket domain from `.appspot.com` to `.firebasestorage.app` — so
 * unlike the old shared `lovedigitally-app` project, the bucket name is not
 * simply `${FIREBASE_PROJECT_ID}.appspot.com`. The literal is used for the
 * real project id specifically; `GCLOUD_PROJECT` overridden to anything
 * else (a future project, a differently-named local emulator run) falls
 * back to the older convention rather than guessing wrong.
 */
export const DEFAULT_STORAGE_BUCKET =
  FIREBASE_PROJECT_ID === 'lovedigitally-puzzle'
    ? 'lovedigitally-puzzle.firebasestorage.app'
    : `${FIREBASE_PROJECT_ID}.appspot.com`;
