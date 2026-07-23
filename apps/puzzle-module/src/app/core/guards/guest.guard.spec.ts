import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';

import { AuthFacade } from '@application/creator/auth.facade';

import { guestGuard } from './guest.guard';

describe('guestGuard', () => {
  let authReady: ReturnType<typeof signal<boolean>>;
  let isAuthenticated: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    authReady = signal(false);
    isAuthenticated = signal(false);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: { authReady, isAuthenticated } as unknown as AuthFacade,
        },
      ],
    });
  });

  function runGuard(): Promise<boolean | UrlTree> {
    return TestBed.runInInjectionContext(() => {
      const result = guestGuard({} as never, {} as never);
      return firstValueFrom(result as Observable<boolean | UrlTree>);
    });
  }

  it('allows navigation to auth pages once authReady and not authenticated', async () => {
    const resultPromise = runGuard();
    authReady.set(true);

    expect(await resultPromise).toBeTrue();
  });

  it('redirects an already-authenticated Creator to /creator', async () => {
    isAuthenticated.set(true);
    const resultPromise = runGuard();
    authReady.set(true);

    const result = await resultPromise;
    expect(result).toBeInstanceOf(UrlTree);
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(result as UrlTree)).toBe('/creator');
  });
});
