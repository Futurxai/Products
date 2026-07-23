import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { from, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Creator } from '@domain/models/creator.model';
import { describeAuthError } from '@domain/errors/auth-errors';

import { AuthUseCase } from './auth.usecase';

/**
 * The Signal-based store `features/creator/auth/*` pages (and the
 * `creatorAuthGuard`/`guestGuard` route guards) actually inject. Pages
 * never talk to `AuthUseCase` directly — this is the layer that turns
 * "an async action happened" into readable, reactive UI state.
 */
@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly authUseCase = inject(AuthUseCase);

  private readonly _currentCreator = signal<Creator | null>(null);
  /** False until the very first `authState()` emission resolves — lets guards avoid a false "not signed in" redirect while a page-refresh session is still restoring. */
  private readonly _authReady = signal(false);
  /** True only while an explicit action (signUp/logIn/…) is in flight — separate from `authReady`, which covers passive session restore. */
  private readonly _actionLoading = signal(false);
  private readonly _actionError = signal<string | null>(null);

  readonly currentCreator = this._currentCreator.asReadonly();
  readonly authReady = this._authReady.asReadonly();
  readonly actionLoading = this._actionLoading.asReadonly();
  readonly actionError = this._actionError.asReadonly();
  readonly isAuthenticated = computed(() => this._currentCreator() !== null);

  constructor() {
    this.authUseCase
      .authState()
      .pipe(
        switchMap((authUser) => (authUser ? from(this.authUseCase.resolveProfile(authUser)) : of(null))),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (creator) => {
          this._currentCreator.set(creator);
          this._authReady.set(true);
        },
        error: () => {
          this._currentCreator.set(null);
          this._authReady.set(true);
        },
      });
  }

  async signUp(email: string, password: string, displayName: string): Promise<boolean> {
    return this.runAction(() => this.authUseCase.signUp(email, password, displayName));
  }

  async logIn(email: string, password: string): Promise<boolean> {
    return this.runAction(() => this.authUseCase.logInWithEmail(email, password));
  }

  async logInWithGoogle(): Promise<boolean> {
    return this.runAction(() => this.authUseCase.logInWithGoogle());
  }

  async logOut(): Promise<void> {
    await this.authUseCase.logOut();
    this._currentCreator.set(null);
  }

  async sendPasswordReset(email: string): Promise<boolean> {
    this._actionLoading.set(true);
    this._actionError.set(null);
    try {
      await this.authUseCase.sendPasswordReset(email);
      return true;
    } catch (error) {
      this._actionError.set(describeAuthError(error));
      return false;
    } finally {
      this._actionLoading.set(false);
    }
  }

  clearError(): void {
    this._actionError.set(null);
  }

  private async runAction(action: () => Promise<Creator>): Promise<boolean> {
    this._actionLoading.set(true);
    this._actionError.set(null);
    try {
      const creator = await action();
      this._currentCreator.set(creator);
      return true;
    } catch (error) {
      this._actionError.set(describeAuthError(error));
      return false;
    } finally {
      this._actionLoading.set(false);
    }
  }
}
