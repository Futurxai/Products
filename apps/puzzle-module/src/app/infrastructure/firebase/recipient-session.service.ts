import { Injectable, inject } from '@angular/core';
import { Auth, signInWithCustomToken } from '@angular/fire/auth';

import { RecipientSessionPort } from '@domain/ports/recipient-session.port';

/**
 * `RecipientSessionPort` implemented against `@angular/fire/auth`. The
 * custom token itself was minted server-side by `resolveShareToken`
 * (M2) — this service's only job is handing it to Firebase Auth so the
 * resulting ID token (carrying the `experienceId` custom claim) is
 * attached to every subsequent callable automatically. No error mapping
 * to a domain type here: an invalid/expired custom token is already a
 * contradiction (the server just minted it a moment ago), so a failure
 * here is treated as a genuine infra failure by
 * `PuzzleSessionFacade.resolveLink`, not a business-rule rejection.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseRecipientSessionService implements RecipientSessionPort {
  private readonly auth = inject(Auth);

  // Held as an overridable instance property, not called inline — same
  // "frozen ESM export can't be spyOn'd" reasoning as
  // `functions-puzzle-api.service.ts`'s `callFunction`.
  private signIn = (customToken: string): Promise<unknown> => signInWithCustomToken(this.auth, customToken);

  async signInWithCustomToken(customToken: string): Promise<void> {
    await this.signIn(customToken);
  }
}
