#!/usr/bin/env node
/**
 * Substitutes the real Firebase Web SDK apiKey into environment.prod.ts,
 * read from an environment variable — never hand-edited, never committed
 * as a real value (see environment.prod.ts's own doc comment and
 * DEPLOYMENT.md's Environment Verification section).
 *
 * `authDomain`/`projectId`/`storageBucket`/`messagingSenderId`/`appId`/
 * `measurementId` are already committed as real values for the
 * `lovedigitally-puzzle` project (ADR-0011) — only `apiKey` still needs
 * build-time substitution here.
 *
 * Run before `ng build --configuration production` for an actual
 * deploy (`npm run build:deploy` does this automatically) — never for
 * the plain CI validation build (`build:prod`), which intentionally
 * builds against the placeholder since it only needs to prove the app
 * compiles, not that it's deployable.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = resolve(__dirname, '../src/environments/environment.prod.ts');

const REQUIRED_VARS = {
  FIREBASE_API_KEY: '__LOVEDIGITALLY_PUZZLE_WEB_API_KEY__',
};

const missing = Object.keys(REQUIRED_VARS).filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(
    `[apply-prod-env] Missing required environment variable(s): ${missing.join(', ')}.\n` +
      '  This script only runs for a real deploy build (npm run build:deploy) — not for CI\'s\n' +
      '  validation build (build:prod), which is expected to compile against the placeholder.\n' +
      '  Set this from a GitHub Actions repository secret, or export it locally if deploying\n' +
      '  by hand. See DEPLOYMENT.md > Environment Verification.',
  );
  process.exit(1);
}

let content = readFileSync(ENV_FILE, 'utf8');
for (const [envVar, placeholder] of Object.entries(REQUIRED_VARS)) {
  content = content.split(placeholder).join(process.env[envVar]);
}

writeFileSync(ENV_FILE, content);
console.log('[apply-prod-env] environment.prod.ts updated with real Firebase apiKey for this build.');
