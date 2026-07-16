import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppStateService } from '../services/app-state.service';

export const authGuard: CanActivateFn = () => {
  const state = inject(AppStateService);
  const router = inject(Router);
  if (state.currentUser) return true;
  return router.createUrlTree(['/role-select']);
};
