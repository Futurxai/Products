import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Observable } from 'rxjs';

import { AuthFacade } from '@application/creator/auth.facade';

import { creatorAuthGuard } from './creator-auth.guard';

describe('creatorAuthGuard', () => {
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

  function runGuard(url: string): Promise<boolean | UrlTree> {
    return TestBed.runInInjectionContext(() => {
      const result = creatorAuthGuard({} as never, { url } as never);
      return firstValueFrom(result as Observable<boolean | UrlTree>);
    });
  }

  it('waits for authReady before resolving — does not resolve while still restoring', (done) => {
    const promise = runGuard('/creator');
    let resolved = false;
    // Deliberately left pending (authReady never flips true in this test) — TestBed
    // tears down the observable's source on the next test's setup, which completes
    // it without a value; that's expected here, not a real failure, so swallow it.
    promise.then(() => (resolved = true)).catch(() => undefined);

    setTimeout(() => {
      expect(resolved).toBeFalse();
      done();
    }, 0);
  });

  it('allows navigation once authReady and authenticated', async () => {
    isAuthenticated.set(true);
    const resultPromise = runGuard('/creator');
    authReady.set(true);

    expect(await resultPromise).toBeTrue();
  });

  it('redirects to /auth/login with a returnUrl once authReady and not authenticated', async () => {
    const resultPromise = runGuard('/creator/dashboard');
    authReady.set(true);

    const result = await resultPromise;
    expect(result).toBeInstanceOf(UrlTree);
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(result as UrlTree)).toBe('/auth/login?returnUrl=%2Fcreator%2Fdashboard');
  });
});
