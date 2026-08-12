#!/usr/bin/env node
/**
 * Substitutes real Firebase Web SDK config into environment.prod.ts,
 * read from environment variables — never hand-edited, never committed
 * with real values (see environment.prod.ts's own doc comment and
 * DEPLOYMENT.md's Environment Verification section).
 *
 * Firebase web config (apiKey, appId, etc.) is not a secret in the
 * traditional sense — it's safe to ship client-side by Firebase's own
 * design — but it must still come from a real source at deploy time,
 * not live in this repo as a placeholder pretending to be real. Source
 * these three from GitHub Actions repository secrets (Settings →
 * Secrets and variables → Actions) named exactly:
 *   FIREBASE_API_KEY, FIREBASE_SENDER_ID, FIREBASE_APP_ID
 *
 * Run before `ng build --configuration production` for an actual
 * deploy (`npm run build:deploy` does this automatically) — never for
 * the plain CI validation build (`build:prod`), which intentionally
 * builds against placeholders since it only needs to prove the app
 * compiles, not that it's deployable.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = resolve(__dirname, '../src/environments/environment.prod.ts');

const REQUIRED_VARS = {
  FIREBASE_API_KEY: '__LOVEDIGITALLY_APP_WEB_API_KEY__',
  FIREBASE_SENDER_ID: '__LOVEDIGITALLY_APP_SENDER_ID__',
  FIREBASE_APP_ID: '__PUZZLE_MODULE_WEB_APP_ID__',
};

const missing = Object.keys(REQUIRED_VARS).filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(
    `[apply-prod-env] Missing required environment variable(s): ${missing.join(', ')}.\n` +
      '  This script only runs for a real deploy build (npm run build:deploy) — not for CI\'s\n' +
      '  validation build (build:prod), which is expected to compile against placeholders.\n' +
      '  Set these from GitHub Actions repository secrets, or export them locally if deploying\n' +
      '  by hand. See DEPLOYMENT.md > Environment Verification.',
  );
  process.exit(1);
}

let content = readFileSync(ENV_FILE, 'utf8');
for (const [envVar, placeholder] of Object.entries(REQUIRED_VARS)) {
  content = content.split(placeholder).join(process.env[envVar]);
}

writeFileSync(ENV_FILE, content);
console.log('[apply-prod-env] environment.prod.ts updated with real Firebase config for this build.');
