import { Auth } from 'firebase-admin/auth';

/**
 * Mints the anonymous, per-experience session a Recipient uses without
 * ever seeing a login screen (Phase 5/6 architecture decision #2,
 * resolving the PRD's open question on recipient identity). A custom
 * claim ties the session to exactly one `experienceId`, which is what
 * lets `puzzle_progress`'s Firestore rule scope reads without any
 * client-visible auth flow.
 */
export interface AuthService {
  /**
   * Creates a brand-new anonymous Firebase Auth user, stamps it with
   * `{ experienceId }`, and returns a custom token the client exchanges
   * for a real ID token via `signInWithCustomToken`. A fresh user per
   * resolve (rather than reusing one) keeps sessions cleanly scoped to
   * a single experience — no session accumulates access to more than
   * one over time.
   */
  createExperienceSession(experienceId: string): Promise<{ uid: string; customToken: string }>;
}

export function createAuthService(auth: Auth): AuthService {
  return {
    async createExperienceSession(experienceId: string) {
      const user = await auth.createUser({});
      await auth.setCustomUserClaims(user.uid, { experienceId });
      const customToken = await auth.createCustomToken(user.uid, { experienceId });
      return { uid: user.uid, customToken };
    },
  };
}
