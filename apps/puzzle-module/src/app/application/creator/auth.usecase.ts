import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthUser } from '@domain/models/auth-user.model';
import { Creator, draftCreator } from '@domain/models/creator.model';

import { AUTH_PORT, CREATOR_REPOSITORY_PORT } from './auth.tokens';

/**
 * Orchestrates `AuthPort` (Firebase Auth identity) and
 * `CreatorRepositoryPort` (Firestore profile) into the single "who is
 * this Creator" concept the rest of the app deals with. Neither port
 * alone has enough information — Auth doesn't know `phone`/app fields,
 * Firestore doesn't manage sessions — so this use-case is what actually
 * produces a `Creator`.
 */
@Injectable({ providedIn: 'root' })
export class AuthUseCase {
  private readonly authPort = inject(AUTH_PORT);
  private readonly creatorRepository = inject(CREATOR_REPOSITORY_PORT);

  /** Passthrough to `AuthPort.authState()` — kept here so `AuthFacade` never has to know about the port tokens directly. */
  authState(): Observable<AuthUser | null> {
    return this.authPort.authState();
  }

  async signUp(email: string, password: string, displayName: string): Promise<Creator> {
    const authUser = await this.authPort.signUpWithEmail(email, password, displayName);
    return this.resolveProfile(authUser);
  }

  async logInWithEmail(email: string, password: string): Promise<Creator> {
    const authUser = await this.authPort.logInWithEmail(email, password);
    return this.resolveProfile(authUser);
  }

  async logInWithGoogle(): Promise<Creator> {
    const authUser = await this.authPort.logInWithGoogle();
    return this.resolveProfile(authUser);
  }

  async logOut(): Promise<void> {
    await this.authPort.logOut();
  }

  async sendPasswordReset(email: string): Promise<void> {
    await this.authPort.sendPasswordResetEmail(email);
  }

  /**
   * Loads the Firestore profile for an authenticated identity, creating
   * it on first sight (a brand-new sign-up, or a Google sign-in whose
   * profile-creation step never completed last time — no separate
   * "repair" flow needed, this just self-heals). Called both right
   * after an explicit sign-up/login action above and from
   * `AuthFacade`'s `authState()` subscription on session restore (e.g.
   * a page refresh), so there is exactly one code path that decides
   * what a Creator's profile looks like.
   */
  async resolveProfile(authUser: AuthUser): Promise<Creator> {
    const existing = await this.creatorRepository.getById(authUser.uid);
    if (existing) {
      return existing;
    }

    const creator = draftCreator({
      creatorId: authUser.uid,
      displayName: authUser.displayName ?? authUser.email,
      email: authUser.email,
      signupMethod: authUser.signupMethod,
      avatarUrl: authUser.photoUrl,
    });
    await this.creatorRepository.create(creator);
    return creator;
  }
}
