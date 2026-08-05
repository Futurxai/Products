import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BehaviorSubject, Observable } from 'rxjs';

import { AuthPort } from '@domain/ports/auth.port';
import { CreatorRepositoryPort } from '@domain/ports/creator-repository.port';
import { AuthUser } from '@domain/models/auth-user.model';
import { Creator } from '@domain/models/creator.model';
import { InvalidCredentialsError } from '@domain/errors/auth-errors';

import { AUTH_PORT, CREATOR_REPOSITORY_PORT } from './auth.tokens';
import { AuthFacade } from './auth.facade';

class FakeAuthPort implements AuthPort {
  authStateSubject = new BehaviorSubject<AuthUser | null>(null);
  loginShouldFail = false;

  async signUpWithEmail(email: string, _password: string, displayName: string): Promise<AuthUser> {
    return { uid: 'uid_1', email, displayName, photoUrl: null, signupMethod: 'email' };
  }
  async logInWithEmail(email: string): Promise<AuthUser> {
    if (this.loginShouldFail) {
      throw new InvalidCredentialsError();
    }
    return { uid: 'uid_1', email, displayName: 'Vikram Rao', photoUrl: null, signupMethod: 'email' };
  }
  async logInWithGoogle(): Promise<AuthUser> {
    return { uid: 'uid_1', email: 'vikram.rao@example.com', displayName: 'Vikram Rao', photoUrl: null, signupMethod: 'google' };
  }
  async logOut(): Promise<void> {}
  async sendPasswordResetEmail(): Promise<void> {}

  /**
   * Deliberately NOT `this.authStateSubject.asObservable()` — a real
   * `BehaviorSubject` replays synchronously on subscribe, but Firebase's
   * actual `onAuthStateChanged` (what `@angular/fire/auth`'s
   * `authState()` wraps) always fires asynchronously, even for a
   * persisted session, because it has to check IndexedDB first. A
   * synchronous fake would let a test pass even if `AuthFacade` assumed
   * synchronous delivery — which it must not, since `authReady` needs a
   * real "not resolved yet" window on page load.
   */
  authState(): Observable<AuthUser | null> {
    return new Observable<AuthUser | null>((subscriber) => {
      const subscription = this.authStateSubject.subscribe((value) => {
        setTimeout(() => subscriber.next(value));
      });
      return () => subscription.unsubscribe();
    });
  }
}

class FakeCreatorRepository implements CreatorRepositoryPort {
  creators = new Map<string, Creator>();
  async getById(creatorId: string): Promise<Creator | null> {
    return this.creators.get(creatorId) ?? null;
  }
  async create(creator: Creator): Promise<void> {
    this.creators.set(creator.creatorId, creator);
  }
  async update(): Promise<void> {}
}

describe('AuthFacade', () => {
  let authPort: FakeAuthPort;

  beforeEach(() => {
    authPort = new FakeAuthPort();
    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_PORT, useValue: authPort },
        { provide: CREATOR_REPOSITORY_PORT, useValue: new FakeCreatorRepository() },
      ],
    });
  });

  // Constructing AuthFacade is what starts its authState() subscription
  // (which schedules a `setTimeout`, per FakeAuthPort's doc comment
  // above). Injecting it here, inside each test's own zone, keeps that
  // timer's execution deterministic — `fakeAsync`'s `tick()` only
  // flushes timers scheduled within its own zone, so a facade built in
  // a plain `beforeEach` would leave that first emission un-flushable.
  function createFacade(): AuthFacade {
    return TestBed.inject(AuthFacade);
  }

  it('starts with authReady false and no current creator', () => {
    const facade = createFacade();
    expect(facade.authReady()).toBeFalse();
    expect(facade.currentCreator()).toBeNull();
    expect(facade.isAuthenticated()).toBeFalse();
  });

  it('becomes authReady once the initial authState() emission (signed-out) resolves', fakeAsync(() => {
    const facade = createFacade();
    tick();
    expect(facade.authReady()).toBeTrue();
    expect(facade.currentCreator()).toBeNull();
  }));

  it('restores the current creator when authState() emits a signed-in user', fakeAsync(() => {
    const facade = createFacade();
    tick(); // flush the initial signed-out emission
    authPort.authStateSubject.next({
      uid: 'uid_1',
      email: 'vikram.rao@example.com',
      displayName: 'Vikram Rao',
      photoUrl: null,
      signupMethod: 'email',
    });
    tick();

    expect(facade.authReady()).toBeTrue();
    expect(facade.currentCreator()?.creatorId).toBe('uid_1');
    expect(facade.isAuthenticated()).toBeTrue();
  }));

  it('logIn sets currentCreator and clears loading on success', async () => {
    const facade = createFacade();
    const result = await facade.logIn('vikram.rao@example.com', 'DevTest@123');

    expect(result).toBeTrue();
    expect(facade.currentCreator()?.email).toBe('vikram.rao@example.com');
    expect(facade.actionLoading()).toBeFalse();
    expect(facade.actionError()).toBeNull();
  });

  it('logIn surfaces a readable message and returns false on failure', async () => {
    const facade = createFacade();
    authPort.loginShouldFail = true;

    const result = await facade.logIn('vikram.rao@example.com', 'wrong-password');

    expect(result).toBeFalse();
    expect(facade.currentCreator()).toBeNull();
    expect(facade.actionError()).toBe('Incorrect email or password. Please try again.');
    expect(facade.actionLoading()).toBeFalse();
  });

  it('logOut clears the current creator', async () => {
    const facade = createFacade();
    await facade.logIn('vikram.rao@example.com', 'DevTest@123');
    expect(facade.currentCreator()).not.toBeNull();

    await facade.logOut();

    expect(facade.currentCreator()).toBeNull();
  });

  it('clearError resets actionError', async () => {
    const facade = createFacade();
    authPort.loginShouldFail = true;
    await facade.logIn('vikram.rao@example.com', 'wrong-password');
    expect(facade.actionError()).not.toBeNull();

    facade.clearError();

    expect(facade.actionError()).toBeNull();
  });
});
