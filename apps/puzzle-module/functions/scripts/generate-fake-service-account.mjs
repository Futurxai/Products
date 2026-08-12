#!/usr/bin/env node
/**
 * Generates a throwaway, LOCALLY-created (never Google-issued) RSA
 * keypair shaped like a GCP service account JSON, used only so
 * `bucket.file().getSignedUrl()` has a private key to sign with during
 * emulator tests. V4 URL signing is pure local cryptography (HMAC/RSA
 * over the request, no network call to Google) — it doesn't validate
 * the key against any real Google account, so a self-generated key
 * satisfies it completely for testing our own code's ability to
 * construct and return a signed URL. This key is useless against real
 * GCS and must never be treated as a real credential.
 */
import { generateKeyPairSync } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../.emulator-fixtures');
const outPath = resolve(outDir, 'fake-service-account.json');

mkdirSync(outDir, { recursive: true });

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const fakeServiceAccount = {
  type: 'service_account',
  project_id: 'lovedigitally-app',
  private_key_id: 'local-emulator-testing-only',
  private_key: privateKey,
  client_email: 'emulator-testing@lovedigitally-app.iam.gserviceaccount.com',
  client_id: '000000000000000000000',
  token_uri: 'https://oauth2.googleapis.com/token',
};

writeFileSync(outPath, JSON.stringify(fakeServiceAccount, null, 2));
console.log(`[generate-fake-service-account] Wrote throwaway local key to ${outPath}`);
