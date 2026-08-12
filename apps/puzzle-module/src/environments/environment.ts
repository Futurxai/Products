// Development environment config.
//
// This targets the DEDICATED `lovedigitally-puzzle` Firebase project (see
// ADR-0011 — the Puzzle Module was migrated off the shared `lovedigitally-app`
// project, superseding the Phase 5/6 shared-project decision).
//
// `authDomain`/`projectId`/`storageBucket`/`messagingSenderId`/`appId`/
// `measurementId` are the real values for the registered
// `lovedigitally-puzzle` Web App — Firebase web config is not a secret in
// the traditional sense, it's safe to ship client-side by Firebase's own
// design. `apiKey` is the one value not yet available in this session and
// stays a placeholder — pull it from Firebase Console →
// `lovedigitally-puzzle` → Project Settings → your app, and inject it at
// build/CI time (see apps/puzzle-module/DEPLOYMENT.md's Environment
// Verification section) rather than hand-editing this file.
import { Environment } from './environment.type';

export const environment: Environment = {
  production: false,
  useEmulators: true,
  firebase: {
    apiKey: 'REPLACE_WITH_LOVEDIGITALLY_PUZZLE_WEB_API_KEY',
    authDomain: 'lovedigitally-puzzle.firebaseapp.com',
    projectId: 'lovedigitally-puzzle',
    storageBucket: 'lovedigitally-puzzle.firebasestorage.app',
    messagingSenderId: '810137740688',
    appId: '1:810137740688:web:0c34b74e770d9be7e47f15',
    measurementId: 'G-ZHSM6803MM',
  },
  emulatorHosts: {
    auth: 'http://127.0.0.1:9099',
    firestore: { host: '127.0.0.1', port: 8080 },
    storage: { host: '127.0.0.1', port: 9199 },
    functions: { host: '127.0.0.1', port: 5001 },
  },
};
