import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';

import { FirebaseRecipientSessionService } from './recipient-session.service';

describe('FirebaseRecipientSessionService', () => {
  let service: FirebaseRecipientSessionService;

  function stubSignIn(fn: jasmine.Spy): void {
    (service as unknown as { signIn: jasmine.Spy }).signIn = fn;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: Auth, useValue: {} }] });
    service = TestBed.inject(FirebaseRecipientSessionService);
  });

  it('signs in with the given custom token', async () => {
    const signIn = jasmine.createSpy('signIn').and.resolveTo({ user: { uid: 'anon_1' } });
    stubSignIn(signIn);

    await service.signInWithCustomToken('tok_abc');

    expect(signIn).toHaveBeenCalledWith('tok_abc');
  });

  it('lets a rejected sign-in propagate', async () => {
    stubSignIn(jasmine.createSpy('signIn').and.rejectWith(new Error('auth/invalid-custom-token')));

    await expectAsync(service.signInWithCustomToken('tok_bad')).toBeRejectedWithError('auth/invalid-custom-token');
  });
});
