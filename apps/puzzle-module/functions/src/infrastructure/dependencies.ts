import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { createExperienceStore } from './firestore-experience.store';
import { createProgressStore } from './firestore-progress.store';
import { createStorageService } from './storage.service';
import { createAuthService } from './auth.service';
import { createTokenService } from './token.service';

/**
 * Composition root — the ONE place `firebase-admin` SDK instances get
 * created and wired into the port implementations. Every callable
 * imports from here, never calls `getFirestore()`/`getAuth()` directly
 * — that keeps `admin.initializeApp()` (called once in `index.ts`)
 * and the store/service construction in a single, easily-testable
 * location.
 *
 * Lazily initialized (not module-level `const`) so importing this file
 * in a unit test that never calls these functions doesn't require a
 * live Firebase Admin context.
 */
export function buildDependencies() {
  const db = getFirestore();
  const auth = getAuth();
  const bucket = getStorage().bucket();

  return {
    experienceStore: createExperienceStore(db),
    progressStore: createProgressStore(db),
    storageService: createStorageService(bucket),
    authService: createAuthService(auth),
    tokenService: createTokenService(),
  };
}

export type Dependencies = ReturnType<typeof buildDependencies>;
