import { Injectable, inject } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  User,
  authState as firebaseAuthState,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AuthPort } from '@domain/ports/auth.port';
import { AuthUser } from '@domain/models/auth-user.model';
import { SignupMethod } from '@domain/models/creator.model';
import {
  AuthError,
  EmailAlreadyInUseError,
  InvalidCredentialsError,
  NetworkError,
  PopupClosedByUserError,
  TooManyRequestsError,
  UnknownAuthError,
  UserDisabledError,
  UserNotFoundError,
  WeakPasswordError,
} from '@domain/errors/auth-errors';

/**
 * `AuthPort` implemented against `@angular/fire/auth`. This is the only
 * place in the app that touches a raw Firebase `User` or a
 * `FirebaseError` — every method translates both into the domain's own
 * shapes (`AuthUser`, `AuthError` subclasses) before returning/throwing,
 * so nothing upstream (`AuthUseCase`, `AuthFacade`, the auth pages) ever
 * has to know Firebase exists.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseAuthService implements AuthPort {
  private readonly auth = inject(Auth);

  async signUpWithEmail(email: string, password: string, displayName: string): Promise<AuthUser> {
    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);
      await updateProfile(credential.user, { displayName });
      return toAuthUser(credential.user, 'email');
    } catch (error) {
      throw mapFirebaseAuthError(error, { email });
    }
  }

  async logInWithEmail(email: string, password: string): Promise<AuthUser> {
    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      return toAuthUser(credential.user, 'email');
    } catch (error) {
      throw mapFirebaseAuthError(error, { email });
    }
  }

  async logInWithGoogle(): Promise<AuthUser> {
    try {
      const credential = await signInWithPopup(this.auth, new GoogleAuthProvider());
      return toAuthUser(credential.user, 'google');
    } catch (error) {
      throw mapFirebaseAuthError(error);
    }
  }

  async logOut(): Promise<void> {
    await signOut(this.auth);
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await firebaseSendPasswordResetEmail(this.auth, email);
    } catch (error) {
      throw mapFirebaseAuthError(error, { email });
    }
  }

  authState(): Observable<AuthUser | null> {
    return firebaseAuthState(this.auth).pipe(
      map((user) => (user ? toAuthUser(user, inferSignupMethod(user)) : null)),
    );
  }
}

export function toAuthUser(user: User, signupMethod: SignupMethod): AuthUser {
  return {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName,
    photoUrl: user.photoURL,
    signupMethod,
  };
}

/** Creators only ever sign in via email/password or Google — no anonymous provider on this side (that's the Recipient's flow, M2). */
export function inferSignupMethod(user: User): SignupMethod {
  return user.providerData[0]?.providerId === 'google.com' ? 'google' : 'email';
}

export function mapFirebaseAuthError(error: unknown, context?: { email?: string }): AuthError {
  switch (extractFirebaseErrorCode(error)) {
    case 'auth/email-already-in-use':
      return new EmailAlreadyInUseError(context?.email ?? '');
    case 'auth/weak-password':
      return new WeakPasswordError();
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/invalid-email':
      return new InvalidCredentialsError();
    case 'auth/user-not-found':
      return new UserNotFoundError();
    case 'auth/user-disabled':
      return new UserDisabledError();
    case 'auth/too-many-requests':
      return new TooManyRequestsError();
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return new PopupClosedByUserError();
    case 'auth/network-request-failed':
      return new NetworkError();
    default:
      return new UnknownAuthError(error);
  }
}

export function extractFirebaseErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}
