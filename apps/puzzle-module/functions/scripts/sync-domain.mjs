#!/usr/bin/env node
/**
 * Copies the canonical domain layer (apps/puzzle-module/src/app/domain)
 * into functions/src/domain before every build/test.
 *
 * Why a copy instead of a shared npm package or a relative import
 * across the app/functions boundary:
 *   - A relative import (`../../src/app/domain`) would work for local
 *     builds but silently break `firebase deploy`, which only uploads
 *     the files inside the declared functions `source` directory —
 *     anything imported from outside it is missing on the deployed
 *     function.
 *   - A shared npm package (`@puzzle-module/domain`, workspace-linked)
 *     is the more "correct" long-term answer, but its deploy-safety
 *     depends on how npm resolves `file:`/workspace dependencies
 *     (symlink vs. copy), which varies by npm version and isn't
 *     something this sandbox can fully verify against a real
 *     `firebase deploy`. A plain file copy has zero such ambiguity —
 *     after this script runs, `functions/src/domain` is just files,
 *     no package resolution involved, guaranteed to deploy.
 *
 * `apps/puzzle-module/src/app/domain` remains the ONE hand-edited
 * source (see its README.md). This output directory is regenerated
 * every time (rm -rf then copy) and is gitignored — never edit
 * anything under functions/src/domain directly, it will be overwritten
 * on the next build.
 */
import { cpSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = resolve(__dirname, '../../src/app/domain');
const destination = resolve(__dirname, '../src/domain');

if (!existsSync(source)) {
  console.error(`[sync-domain] Canonical domain source not found at ${source}`);
  process.exit(1);
}

rmSync(destination, { recursive: true, force: true });
cpSync(source, destination, { recursive: true });

console.log(`[sync-domain] Copied ${source} -> ${destination}`);
