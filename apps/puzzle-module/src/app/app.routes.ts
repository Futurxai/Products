import { Routes } from '@angular/router';

/**
 * Root route table.
 *
 * Empty on purpose beyond the scaffold placeholder — this is Milestone
 * M0 (Environment & Infrastructure). Real routes are added as their
 * owning milestones land:
 *   - M3/M4 add the Creator routes (auth, dashboard, wizard, preview,
 *     publish, insights) under creatorAuthGuard.
 *   - M5/M6 add the single recipient route `/e/:shareToken`, resolved
 *     by recipientLinkResolver — deliberately just ONE route with
 *     modals/overlays layered on top of it, per the Phase 4 Navigation
 *     spec: no child routes for question/clue/partner-help/completion,
 *     so there is no URL to skip ahead with.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/scaffold-placeholder/scaffold-placeholder.page').then((m) => m.ScaffoldPlaceholderPage),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
