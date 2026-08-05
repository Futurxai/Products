import { defineConfig, devices } from '@playwright/test';

// End-to-end UAT config. Runs against `ng serve` (development configuration,
// which is emulator-pointed by default — see src/environments/environment.ts)
// with the Firebase emulator suite (auth, firestore, storage, functions)
// already running underneath it. See package.json's `test:e2e` script,
// which wraps this whole thing in `firebase emulators:exec`, and
// README.md's End-to-End UAT section.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      // Pre-installed Chromium in this environment doesn't match Playwright's
      // pinned default revision (no network access to fetch a matching one) —
      // point at it explicitly rather than `npx playwright install`.
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' } },
    },
  ],
  webServer: {
    command: 'npx ng serve --configuration development --port 4200',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
