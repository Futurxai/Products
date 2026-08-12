// Production environment config — see environment.ts for the full
// explanation of why these are placeholders. In CI, this file's
// placeholder values are replaced at build time from secrets (Firebase
// web config for lovedigitally-app), never committed as real values.
import { Environment } from './environment.type';

export const environment: Environment = {
  production: true,
  useEmulators: false,
  firebase: {
    apiKey: '__LOVEDIGITALLY_APP_WEB_API_KEY__',
    authDomain: 'lovedigitally-app.firebaseapp.com',
    projectId: 'lovedigitally-app',
    storageBucket: 'lovedigitally-app.appspot.com',
    messagingSenderId: '__LOVEDIGITALLY_APP_SENDER_ID__',
    appId: '__PUZZLE_MODULE_WEB_APP_ID__',
  },
  emulatorHosts: null,
};
