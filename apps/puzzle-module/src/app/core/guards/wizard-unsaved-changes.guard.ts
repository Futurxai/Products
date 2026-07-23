import { CanDeactivateFn } from '@angular/router';

/** Implemented by `WizardPage` — kept as a tiny interface so this guard doesn't need to know about `PuzzleWizardFacade` directly. */
export interface WizardDeactivationAware {
  hasUnsavedChanges(): boolean;
}

/**
 * The in-app half of "unsaved change protection" — covers Angular
 * Router navigation away from the Wizard (clicking Dashboard, browser
 * back, another route link). The other half, actual tab close/refresh,
 * is a native `beforeunload` listener on `WizardPage` itself (Angular
 * Router guards never run for that).
 *
 * A plain `window.confirm` rather than a custom modal — the Wizard
 * doesn't otherwise need a general-purpose Modal component yet, and a
 * native confirm is the honest, zero-new-surface-area choice for a
 * single yes/no "leave without saving?" prompt.
 */
export const wizardUnsavedChangesGuard: CanDeactivateFn<WizardDeactivationAware> = (component) => {
  if (!component.hasUnsavedChanges()) {
    return true;
  }
  return window.confirm('You have unsaved changes. Leave this page and discard them?');
};
