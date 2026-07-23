/**
 * Canonical set of authentication failure codes. A deliberately separate
 * list from `DomainErrorCode` (domain-errors.ts) — that one enumerates
 * Cloud-Function/gameplay business-rule failures returned as
 * `{ ok: false }`, this one enumerates Firebase Auth SDK failures that
 * arrive as rejected promises on the client. Conflating the two would
 * make `PuzzleApiPort.ApiError` mean two unrelated things.
 */
export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_ALREADY_IN_USE'
  | 'WEAK_PASSWORD'
  | 'USER_NOT_FOUND'
  | 'USER_DISABLED'
  | 'TOO_MANY_REQUESTS'
  | 'POPUP_CLOSED_BY_USER'
  | 'NETWORK_ERROR'
  | 'NOT_AUTHENTICATED'
  | 'UNKNOWN_AUTH_ERROR';

/**
 * Base class for every auth failure surfaced to application/presentation
 * code. Like `DomainError`, has no idea Firebase exists — mapping a raw
 * `FirebaseError` (`auth/wrong-password`, `auth/popup-closed-by-user`, …)
 * to one of these is `infrastructure/firebase/auth.service.ts`'s job
 * (M3), not this file's.
 */
export abstract class AuthError extends Error {
  abstract readonly code: AuthErrorCode;

  protected constructor(message: string, readonly details?: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidCredentialsError extends AuthError {
  readonly code = 'INVALID_CREDENTIALS' as const;
  constructor() {
    super('Incorrect email or password. Please try again.');
  }
}

export class EmailAlreadyInUseError extends AuthError {
  readonly code = 'EMAIL_ALREADY_IN_USE' as const;
  constructor(email: string) {
    super('An account with this email already exists. Try logging in instead.', { email });
  }
}

export class WeakPasswordError extends AuthError {
  readonly code = 'WEAK_PASSWORD' as const;
  constructor() {
    super('Password is too weak. Use at least 8 characters, with a letter and a number.');
  }
}

export class UserNotFoundError extends AuthError {
  readonly code = 'USER_NOT_FOUND' as const;
  constructor() {
    super('No account found with this email.');
  }
}

export class UserDisabledError extends AuthError {
  readonly code = 'USER_DISABLED' as const;
  constructor() {
    super('This account has been disabled. Contact support for help.');
  }
}

export class TooManyRequestsError extends AuthError {
  readonly code = 'TOO_MANY_REQUESTS' as const;
  constructor() {
    super('Too many attempts. Please wait a moment before trying again.');
  }
}

export class PopupClosedByUserError extends AuthError {
  readonly code = 'POPUP_CLOSED_BY_USER' as const;
  constructor() {
    super('Sign-in was cancelled.');
  }
}

export class NetworkError extends AuthError {
  readonly code = 'NETWORK_ERROR' as const;
  constructor() {
    super('Network error. Check your connection and try again.');
  }
}

export class NotAuthenticatedError extends AuthError {
  readonly code = 'NOT_AUTHENTICATED' as const;
  constructor() {
    super('You need to be signed in to do that.');
  }
}

export class UnknownAuthError extends AuthError {
  readonly code = 'UNKNOWN_AUTH_ERROR' as const;
  constructor(cause?: unknown) {
    super('Something went wrong. Please try again.', cause !== undefined ? { cause: String(cause) } : undefined);
  }
}

/** Type guard so facades/guards can narrow `unknown` catch values without an `instanceof` chain everywhere. */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

/** One place that decides what an auth failure looks like to a Creator — every `AuthError` message is already UI-ready by design; anything else (a genuine bug) falls back to a generic message rather than leaking internals. */
export function describeAuthError(error: unknown): string {
  return isAuthError(error) ? error.message : 'Something went wrong. Please try again.';
}
