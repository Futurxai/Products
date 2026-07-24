import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';

import { getApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth, connectAuthEmulator } from '@angular/fire/auth';
import { getFirestore, provideFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { getStorage, provideStorage, connectStorageEmulator } from '@angular/fire/storage';
import { getFunctions, provideFunctions, connectFunctionsEmulator } from '@angular/fire/functions';

import { environment } from '../environments/environment';
import { routes } from './app.routes';

import { AUTH_PORT, CREATOR_REPOSITORY_PORT } from './application/creator/auth.tokens';
import { EXPERIENCE_REPOSITORY_PORT } from './application/creator/experience.tokens';
import { PUZZLE_API_PORT } from './application/creator/publish.tokens';
import { STORAGE_UPLOAD_PORT } from './application/creator/wizard.tokens';
import { PROGRESS_REPOSITORY_PORT, RECIPIENT_SESSION_PORT } from './application/recipient/recipient.tokens';
import { FirebaseAuthService } from './infrastructure/firebase/auth.service';
import { FirestoreCreatorRepository } from './infrastructure/firebase/firestore-creator.repository';
import { FirestoreExperienceRepository } from './infrastructure/firebase/firestore-experience.repository';
import { FirestoreProgressRepository } from './infrastructure/firebase/firestore-progress.repository';
import { FirebaseFunctionsPuzzleApiService } from './infrastructure/firebase/functions-puzzle-api.service';
import { FirebaseRecipientSessionService } from './infrastructure/firebase/recipient-session.service';
import { FirebaseStorageUploadService } from './infrastructure/firebase/storage-upload.service';

/** Every callable in `functions/src/callable/*.ts` deploys to this region (see `define-callable.ts`) — the client must request the same one, or `httpsCallable` resolves against a non-existent `us-central1` deployment. */
const FUNCTIONS_REGION = 'asia-south1';

/**
 * Root application providers.
 *
 * Firebase SDK instances are provided here and nowhere else — every
 * feature/application-layer service depends on a `domain/ports`
 * interface, never on `@angular/fire` or `firebase/*` directly (enforced
 * by the `no-restricted-imports` ESLint rule scoped to those folders).
 * Only `infrastructure/firebase/*` services are allowed to inject these.
 *
 * This keeps the swap from "standalone" to "embedded in a host platform"
 * (Module Contract §5) to a change in this one file, not a rewrite of
 * business logic.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideIonicAngular({
      mode: 'md', // one consistent visual language across iOS/Android — the
      // product's own design system (Phase 4) already defines the identity;
      // platform-native mode switching would fight that, not support it.
    }),

    provideFirebaseApp(() => initializeApp(environment.firebase)),

    provideAuth(() => {
      const auth = getAuth();
      if (environment.useEmulators && isDevMode()) {
        connectAuthEmulator(auth, environment.emulatorHosts!.auth, { disableWarnings: true });
      }
      return auth;
    }),

    provideFirestore(() => {
      const firestore = getFirestore();
      if (environment.useEmulators && isDevMode()) {
        const { host, port } = environment.emulatorHosts!.firestore;
        connectFirestoreEmulator(firestore, host, port);
      }
      return firestore;
    }),

    provideStorage(() => {
      const storage = getStorage();
      if (environment.useEmulators && isDevMode()) {
        const { host, port } = environment.emulatorHosts!.storage;
        connectStorageEmulator(storage, host, port);
      }
      return storage;
    }),

    provideFunctions(() => {
      const fns = getFunctions(getApp(), FUNCTIONS_REGION);
      if (environment.useEmulators && isDevMode()) {
        const { host, port } = environment.emulatorHosts!.functions;
        connectFunctionsEmulator(fns, host, port);
      }
      return fns;
    }),

    { provide: AUTH_PORT, useClass: FirebaseAuthService },
    { provide: CREATOR_REPOSITORY_PORT, useClass: FirestoreCreatorRepository },
    { provide: EXPERIENCE_REPOSITORY_PORT, useClass: FirestoreExperienceRepository },
    { provide: STORAGE_UPLOAD_PORT, useClass: FirebaseStorageUploadService },
    { provide: PUZZLE_API_PORT, useClass: FirebaseFunctionsPuzzleApiService },
    { provide: RECIPIENT_SESSION_PORT, useClass: FirebaseRecipientSessionService },
    { provide: PROGRESS_REPOSITORY_PORT, useClass: FirestoreProgressRepository },
  ],
};
