import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';

import { AuthPort } from '@domain/ports/auth.port';
import { CreatorRepositoryPort } from '@domain/ports/creator-repository.port';
import { AuthUser } from '@domain/models/auth-user.model';
import { Creator } from '@domain/models/creator.model';

import { AUTH_PORT, CREATOR_REPOSITORY_PORT } from './auth.tokens';
import { AuthUseCase } from './auth.usecase';

class FakeAuthPort implements AuthPort {
  signUpCalls: Array<{ email: string; password: string; displayName: string }> = [];
  nextAuthUser: AuthUser = {
    uid: 'uid_1',
    email: 'vikram.rao@example.com',
    displayName: 'Vikram Rao',
    photoUrl: null,
    signupMethod: 'email',
  };

  async signUpWithEmail(email: string, password: string, displayName: string): Promise<AuthUser> {
    this.signUpCalls.push({ email, password, displayName });
    return this.nextAuthUser;
  }
  async logInWithEmail(): Promise<AuthUser> {
    return this.nextAuthUser;
  }
  async logInWithGoogle(): Promise<AuthUser> {
    return { ...this.nextAuthUser, signupMethod: 'google' };
  }
  async logOut(): Promise<void> {}
  async sendPasswordResetEmail(_email: string): Promise<void> {}
  authState(): Observable<AuthUser | null> {
    return of(null);
  }
}

class FakeCreatorRepository implements CreatorRepositoryPort {
  creators = new Map<string, Creator>();
  getCalls: string[] = [];
  createCalls: Creator[] = [];

  async getById(creatorId: string): Promise<Creator | null> {
    this.getCalls.push(creatorId);
    return this.creators.get(creatorId) ?? null;
  }
  async create(creator: Creator): Promise<void> {
    this.createCalls.push(creator);
    this.creators.set(creator.creatorId, creator);
  }
  async update(creatorId: string, changes: Partial<Creator>): Promise<void> {
    const existing = this.creators.get(creatorId);
    if (existing) {
      this.creators.set(creatorId, { ...existing, ...changes });
    }
  }
}

describe('AuthUseCase', () => {
  let authPort: FakeAuthPort;
  let creatorRepository: FakeCreatorRepository;
  let useCase: AuthUseCase;

  beforeEach(() => {
    authPort = new FakeAuthPort();
    creatorRepository = new FakeCreatorRepository();
    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_PORT, useValue: authPort },
        { provide: CREATOR_REPOSITORY_PORT, useValue: creatorRepository },
      ],
    });
    useCase = TestBed.inject(AuthUseCase);
  });

  it('signUp creates a Firestore profile for a brand-new Creator', async () => {
    const creator = await useCase.signUp('vikram.rao@example.com', 'DevTest@123', 'Vikram Rao');

    expect(creator.creatorId).toBe('uid_1');
    expect(creator.displayName).toBe('Vikram Rao');
    expect(creator.signupMethod).toBe('email');
    expect(creatorRepository.createCalls.length).toBe(1);
  });

  it('logInWithEmail reuses an existing profile instead of creating a duplicate', async () => {
    const existing: Creator = {
      creatorId: 'uid_1',
      displayName: 'Vikram Rao',
      email: 'vikram.rao@example.com',
      phone: null,
      avatarUrl: null,
      signupMethod: 'email',
      createdAt: new Date('2026-01-04T09:12:00+05:30'),
    };
    creatorRepository.creators.set('uid_1', existing);

    const creator = await useCase.logInWithEmail('vikram.rao@example.com', 'DevTest@123');

    expect(creator).toBe(existing);
    expect(creatorRepository.createCalls.length).toBe(0);
  });

  it('logInWithGoogle self-heals a missing profile for a first-time OAuth sign-in', async () => {
    const creator = await useCase.logInWithGoogle();

    expect(creator.signupMethod).toBe('google');
    expect(creatorRepository.createCalls.length).toBe(1);
  });

  it('resolveProfile falls back to email as displayName when Auth has none', async () => {
    const authUser: AuthUser = {
      uid: 'uid_2',
      email: 'noname@example.com',
      displayName: null,
      photoUrl: null,
      signupMethod: 'google',
    };

    const creator = await useCase.resolveProfile(authUser);

    expect(creator.displayName).toBe('noname@example.com');
  });

  it('logOut delegates to the auth port', async () => {
    spyOn(authPort, 'logOut').and.callThrough();
    await useCase.logOut();
    expect(authPort.logOut).toHaveBeenCalled();
  });

  it('sendPasswordReset delegates to the auth port', async () => {
    spyOn(authPort, 'sendPasswordResetEmail').and.callThrough();
    await useCase.sendPasswordReset('vikram.rao@example.com');
    expect(authPort.sendPasswordResetEmail).toHaveBeenCalledWith('vikram.rao@example.com');
  });
});
