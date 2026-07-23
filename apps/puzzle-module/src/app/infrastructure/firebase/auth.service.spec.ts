import { User } from '@angular/fire/auth';

import {
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

import { extractFirebaseErrorCode, inferSignupMethod, mapFirebaseAuthError, toAuthUser } from './auth.service';

function fakeFirebaseError(code: string): unknown {
  return { code, message: `Firebase: Error (${code}).`, name: 'FirebaseError' };
}

describe('mapFirebaseAuthError', () => {
  it('maps auth/email-already-in-use, carrying the attempted email through', () => {
    const error = mapFirebaseAuthError(fakeFirebaseError('auth/email-already-in-use'), {
      email: 'vikram.rao@example.com',
    });
    expect(error).toBeInstanceOf(EmailAlreadyInUseError);
    expect(error.details?.['email']).toBe('vikram.rao@example.com');
  });

  it('maps auth/weak-password', () => {
    expect(mapFirebaseAuthError(fakeFirebaseError('auth/weak-password'))).toBeInstanceOf(WeakPasswordError);
  });

  it('maps invalid-credential/wrong-password/invalid-email to one InvalidCredentialsError', () => {
    for (const code of ['auth/invalid-credential', 'auth/wrong-password', 'auth/invalid-email']) {
      expect(mapFirebaseAuthError(fakeFirebaseError(code))).toBeInstanceOf(InvalidCredentialsError);
    }
  });

  it('maps auth/user-not-found', () => {
    expect(mapFirebaseAuthError(fakeFirebaseError('auth/user-not-found'))).toBeInstanceOf(UserNotFoundError);
  });

  it('maps auth/user-disabled', () => {
    expect(mapFirebaseAuthError(fakeFirebaseError('auth/user-disabled'))).toBeInstanceOf(UserDisabledError);
  });

  it('maps auth/too-many-requests', () => {
    expect(mapFirebaseAuthError(fakeFirebaseError('auth/too-many-requests'))).toBeInstanceOf(TooManyRequestsError);
  });

  it('maps popup-closed-by-user/cancelled-popup-request to one PopupClosedByUserError', () => {
    for (const code of ['auth/popup-closed-by-user', 'auth/cancelled-popup-request']) {
      expect(mapFirebaseAuthError(fakeFirebaseError(code))).toBeInstanceOf(PopupClosedByUserError);
    }
  });

  it('maps auth/network-request-failed', () => {
    expect(mapFirebaseAuthError(fakeFirebaseError('auth/network-request-failed'))).toBeInstanceOf(NetworkError);
  });

  it('falls back to UnknownAuthError for an unrecognized code, and for a non-Firebase throw', () => {
    expect(mapFirebaseAuthError(fakeFirebaseError('auth/some-new-error-code'))).toBeInstanceOf(UnknownAuthError);
    expect(mapFirebaseAuthError(new Error('boom'))).toBeInstanceOf(UnknownAuthError);
    expect(mapFirebaseAuthError('not even an object')).toBeInstanceOf(UnknownAuthError);
  });
});

describe('extractFirebaseErrorCode', () => {
  it('reads a string `code` property off an object', () => {
    expect(extractFirebaseErrorCode(fakeFirebaseError('auth/user-disabled'))).toBe('auth/user-disabled');
  });

  it('returns undefined for null, primitives, or a non-string code', () => {
    expect(extractFirebaseErrorCode(null)).toBeUndefined();
    expect(extractFirebaseErrorCode('boom')).toBeUndefined();
    expect(extractFirebaseErrorCode({ code: 42 })).toBeUndefined();
  });
});

describe('toAuthUser / inferSignupMethod', () => {
  function fakeUser(providerId: string): User {
    return {
      uid: 'uid_1',
      email: 'vikram.rao@example.com',
      displayName: 'Vikram Rao',
      photoURL: 'https://i.pravatar.cc/150?img=12',
      providerData: [{ providerId } as never],
    } as unknown as User;
  }

  it('infers google signup method from google.com provider data', () => {
    expect(inferSignupMethod(fakeUser('google.com'))).toBe('google');
  });

  it('defaults to email for password (or any non-google) provider data', () => {
    expect(inferSignupMethod(fakeUser('password'))).toBe('email');
  });

  it('toAuthUser maps a Firebase User onto the domain AuthUser shape', () => {
    const authUser = toAuthUser(fakeUser('password'), 'email');
    expect(authUser).toEqual({
      uid: 'uid_1',
      email: 'vikram.rao@example.com',
      displayName: 'Vikram Rao',
      photoUrl: 'https://i.pravatar.cc/150?img=12',
      signupMethod: 'email',
    });
  });

  it('toAuthUser falls back to an empty string email when Firebase has none (e.g. phone-auth users)', () => {
    const user = { ...fakeUser('password'), email: null } as User;
    expect(toAuthUser(user, 'email').email).toBe('');
  });
});
