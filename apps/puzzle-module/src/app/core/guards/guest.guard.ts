import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';

import { AuthFacade } from '@application/creator/auth.facade';

/**
 * The inverse of `creatorAuthGuard` — keeps an already-signed-in Creator
 * off `/auth/login`, `/auth/signup`, and `/auth/forgot-password` (there
 * is nothing for them to do there, and landing on Login after a
 * successful session restore would be a confusing dead end).
 */
export const guestGuard: CanActivateFn = () => {
  const authFacade = inject(AuthFacade);
  const router = inject(Router);

  return toObservable(authFacade.authReady).pipe(
    filter((ready) => ready),
    take(1),
    map(() => (authFacade.isAuthenticated() ? router.createUrlTree(['/creator']) : true)),
  );
};
