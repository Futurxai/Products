import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppStateService } from '../services/app-state.service';

export const managerGuard: CanActivateFn = () => {
  const state = inject(AppStateService);
  const router = inject(Router);
  if (state.isManager) return true;
  return router.createUrlTree(['/tabs/home']);
};
