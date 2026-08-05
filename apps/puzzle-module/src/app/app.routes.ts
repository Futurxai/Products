import { Routes } from '@angular/router';

import { creatorAuthGuard } from './core/guards/creator-auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { wizardUnsavedChangesGuard } from './core/guards/wizard-unsaved-changes.guard';

/**
 * Root route table.
 *
 * `/auth/*` (`guestGuard`), `/creator` (`creatorAuthGuard`, the
 * Dashboard as of M3 Feature 2), `/creator/wizard/:experienceId`
 * (`creatorAuthGuard` + `wizardUnsavedChangesGuard`, the Puzzle
 * Creation Wizard as of M3 Feature 3), `/creator/preview/:experienceId`
 * (`creatorAuthGuard`, the Puzzle Preview as of M3 Feature 4),
 * `/creator/publish/:experienceId` (`creatorAuthGuard`, Publish & Share
 * as of M3 Feature 5), and `/e/:shareToken` (no guard — `resolveShareToken`
 * itself IS the auth check, the link is the credential; the Recipient
 * experience as of M4) are the only routes. `/e/:shareToken` is
 * deliberately just the one route with everything past it (Welcome,
 * Board, Question, Completion) handled as internal state inside
 * `ExperiencePage`, per the Phase 4 Navigation spec — no child routes,
 * so there is no URL to skip ahead with.
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
    path: 'creator/preview/:experienceId',
    canActivate: [creatorAuthGuard],
    loadComponent: () => import('./features/creator/preview/preview.page').then((m) => m.PreviewPage),
  },
  {
    path: 'creator/publish/:experienceId',
    canActivate: [creatorAuthGuard],
    loadComponent: () => import('./features/creator/publish/publish.page').then((m) => m.PublishPage),
  },
  {
    path: 'e/:shareToken',
    loadComponent: () => import('./features/recipient/experience.page').then((m) => m.ExperiencePage),
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
