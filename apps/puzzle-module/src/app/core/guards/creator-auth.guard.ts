import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';

import { AuthFacade } from '@application/creator/auth.facade';

/**
 * Protects Creator-only routes (dashboard, wizard, preview, publish).
 * Waits for `authFacade.authReady()` before deciding anything — without
 * that, a page refresh while genuinely signed in would flash a redirect
 * to `/auth/login` before the session had a chance to restore, since
 * `currentCreator()` starts `null` on every fresh app load regardless of
 * whether a session actually exists.
 */
export const creatorAuthGuard: CanActivateFn = (_route, state) => {
  const authFacade = inject(AuthFacade);
  const router = inject(Router);

  return toObservable(authFacade.authReady).pipe(
    filter((ready) => ready),
    take(1),
    map(() =>
      authFacade.isAuthenticated() ? true : router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } }),
    ),
  );
};
