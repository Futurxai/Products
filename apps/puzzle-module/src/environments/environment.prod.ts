// Production environment config — see environment.ts for the full
// explanation of why `apiKey` is still a placeholder. In CI, this file's
// `apiKey` placeholder is replaced at build time from a secret (see
// scripts/apply-prod-env.mjs); the rest of the Firebase web config for
// `lovedigitally-puzzle` is committed directly since it's non-secret by
// Firebase's own design and was provided for this migration (ADR-0011).
import { Environment } from './environment.type';

export const environment: Environment = {
  production: true,
  useEmulators: false,
  firebase: {
    apiKey: '__LOVEDIGITALLY_PUZZLE_WEB_API_KEY__',
    authDomain: 'lovedigitally-puzzle.firebaseapp.com',
    projectId: 'lovedigitally-puzzle',
    storageBucket: 'lovedigitally-puzzle.firebasestorage.app',
    messagingSenderId: '810137740688',
    appId: '1:810137740688:web:0c34b74e770d9be7e47f15',
    measurementId: 'G-ZHSM6803MM',
  },
  emulatorHosts: null,
};
