import { WizardDeactivationAware, wizardUnsavedChangesGuard } from './wizard-unsaved-changes.guard';

describe('wizardUnsavedChangesGuard', () => {
  function component(hasUnsavedChanges: boolean): WizardDeactivationAware {
    return { hasUnsavedChanges: () => hasUnsavedChanges };
  }

  it('allows navigation without prompting when there are no unsaved changes', () => {
    spyOn(window, 'confirm');

    const result = wizardUnsavedChangesGuard(component(false), {} as never, {} as never, {} as never);

    expect(result).toBeTrue();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('prompts and allows navigation when the user confirms discarding unsaved changes', () => {
    spyOn(window, 'confirm').and.returnValue(true);

    const result = wizardUnsavedChangesGuard(component(true), {} as never, {} as never, {} as never);

    expect(result).toBeTrue();
    expect(window.confirm).toHaveBeenCalledWith('You have unsaved changes. Leave this page and discard them?');
  });

  it('blocks navigation when the user declines the prompt', () => {
    spyOn(window, 'confirm').and.returnValue(false);

    const result = wizardUnsavedChangesGuard(component(true), {} as never, {} as never, {} as never);

    expect(result).toBeFalse();
  });
});
