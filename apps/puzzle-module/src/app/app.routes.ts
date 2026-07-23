import { Routes } from '@angular/router';

import { creatorAuthGuard } from './core/guards/creator-auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { wizardUnsavedChangesGuard } from './core/guards/wizard-unsaved-changes.guard';

/**
 * Root route table.
 *
 * `/auth/*` (`guestGuard`), `/creator` (`creatorAuthGuard`, the
 * Dashboard as of M3 Feature 2), and `/creator/wizard/:experienceId`
 * (`creatorAuthGuard` + `wizardUnsavedChangesGuard`, the Puzzle
 * Creation Wizard as of M3 Feature 3) are the only routes so far.
 * Still to come:
 *   - M3 Features 4-5 add the Preview and Publish routes, also under
 *     `creatorAuthGuard`.
 *   - M5/M6 add the single recipient route `/e/:shareToken`, resolved
 *     by `recipientLinkResolver` — deliberately just ONE route with
 *     modals/overlays layered on top of it, per the Phase 4 Navigation
 *     spec: no child routes for question/clue/partner-help/completion,
 *     so there is no URL to skip ahead with.
 */
export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/creator/auth/login/login.page').then((m) => m.LoginPage),
      },
      {
        path: 'signup',
        loadComponent: () => import('./features/creator/auth/signup/signup.page').then((m) => m.SignupPage),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/creator/auth/forgot-password/forgot-password.page').then((m) => m.ForgotPasswordPage),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },
  {
    path: 'creator',
    canActivate: [creatorAuthGuard],
    loadComponent: () => import('./features/creator/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'creator/wizard/:experienceId',
    canActivate: [creatorAuthGuard],
    canDeactivate: [wizardUnsavedChangesGuard],
    loadComponent: () => import('./features/creator/wizard/wizard.page').then((m) => m.WizardPage),
  },
  {
    path: '',
    redirectTo: 'creator',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'creator',
  },
];
