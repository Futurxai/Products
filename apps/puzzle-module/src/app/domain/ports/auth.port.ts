import { Observable } from 'rxjs';
import { AuthUser } from '../models/auth-user.model';

/**
 * Session/identity operations — the Firebase Auth half of "sign in."
 * Implemented by `infrastructure/firebase/auth.service.ts` (M3) via
 * `@angular/fire/auth`. Deliberately does NOT know about `puzzle_creators`
 * profile documents — that's `CreatorRepositoryPort`'s job. Every method
 * that fails rejects with a typed `AuthError` (`errors/auth-errors.ts`),
 * never a raw `FirebaseError`.
 *
 * `authState()` is the one place this port leans on `rxjs` rather than
 * `Promise` — session state is inherently a stream (it changes on login,
 * logout, and token refresh, not just in response to a single call), and
 * `rxjs` is a general-purpose library, not a Firebase one, so it doesn't
 * violate the "only infrastructure/ imports Firebase" boundary.
 */
export interface AuthPort {
  signUpWithEmail(email: string, password: string, displayName: string): Promise<AuthUser>;
  logInWithEmail(email: string, password: string): Promise<AuthUser>;
  logInWithGoogle(): Promise<AuthUser>;
  logOut(): Promise<void>;
  sendPasswordResetEmail(email: string): Promise<void>;

  /** Emits the current user (or `null`) immediately on subscribe, then again on every auth-state change. */
  authState(): Observable<AuthUser | null>;
}
