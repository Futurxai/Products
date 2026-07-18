import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Present but inert for the MVP (PRD §16 — native builds are explicitly
 * out of scope until Capacitor support is added post-MVP). Configured now
 * so `ionic cap add ios|android` is a config-only step later, not a
 * re-architecture — the whole point of setting this up in M0.
 */
const config: CapacitorConfig = {
  appId: 'ai.futurx.lovedigitally.puzzlemodule',
  appName: 'Love Digitally — Puzzle',
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
};

export default config;
