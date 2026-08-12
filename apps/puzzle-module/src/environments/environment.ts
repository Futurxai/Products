// Development environment config.
//
// This targets the SHARED `lovedigitally-app` Firebase project (per the
// Phase 5/6 architecture update — the Puzzle Module does not get its own
// Firebase project; it's isolated instead by the puzzle_* Firestore/Storage
// namespace and its own Hosting site + Functions codebase).
//
// The values below are placeholders on purpose. Firebase web config
// (apiKey, appId, etc.) is not a secret in the traditional sense — it's
// safe to ship client-side by Firebase's own design — but the *real*
// values for lovedigitally-app were never available in this session, so
// nothing here should be mistaken for a working credential. Pull the
// real config from Firebase Console → lovedigitally-app → Project
// Settings → your app, and set it via CI/build-time replacement (see
// apps/puzzle-module/DEPLOYMENT.md's Environment Verification section)
// rather than hand-editing this file with production values.
import { Environment } from './environment.type';

export const environment: Environment = {
  production: false,
  useEmulators: true,
  firebase: {
    apiKey: 'REPLACE_WITH_LOVEDIGITALLY_APP_WEB_API_KEY',
    authDomain: 'lovedigitally-app.firebaseapp.com',
    projectId: 'lovedigitally-app',
    storageBucket: 'lovedigitally-app.appspot.com',
    messagingSenderId: 'REPLACE_WITH_SENDER_ID',
    appId: 'REPLACE_WITH_PUZZLE_MODULE_WEB_APP_ID',
  },
  emulatorHosts: {
    auth: 'http://127.0.0.1:9099',
    firestore: { host: '127.0.0.1', port: 8080 },
    storage: { host: '127.0.0.1', port: 9199 },
    functions: { host: '127.0.0.1', port: 5001 },
  },
};
