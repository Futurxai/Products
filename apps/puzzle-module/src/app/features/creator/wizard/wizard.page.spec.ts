import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';

import { PuzzleWizardFacade } from '@application/creator/puzzle-wizard.facade';
import { PuzzleExperience } from '@domain/models/puzzle-experience.model';
import { WizardStepCompletion } from '@domain/rules/wizard-progress.rules';
import { ToastService } from '@shared/toast/toast.service';

import { WizardPage } from './wizard.page';

const allIncomplete: WizardStepCompletion = {
  occasion: false,
  image: false,
  recipient: false,
  questions: false,
  completion: false,
  review: false,
};

describe('WizardPage', () => {
  let fixture: ComponentFixture<WizardPage>;
  let page: WizardPage;
  let router: Router;
  let toast: ToastService;
  let startNewDraft: jasmine.Spy;
  let loadDraft: jasmine.Spy;
  let goToStep: jasmine.Spy;
  let draft: ReturnType<typeof signal<PuzzleExperience | null>>;
  let loading: ReturnType<typeof signal<boolean>>;
  let error: ReturnType<typeof signal<string | null>>;
  let saving: ReturnType<typeof signal<boolean>>;
  let hasPendingChanges: ReturnType<typeof signal<boolean>>;
  let lastSavedAt: ReturnType<typeof signal<Date | null>>;
  let currentStep: ReturnType<typeof signal<string>>;
  let stepCompletion: ReturnType<typeof signal<WizardStepCompletion | null>>;

  function configure(paramMapValues: Record<string, string>): void {
    TestBed.resetTestingModule();

    startNewDraft = jasmine.createSpy('startNewDraft').and.resolveTo('new-exp-id');
    loadDraft = jasmine.createSpy('loadDraft').and.resolveTo();
    goToStep = jasmine.createSpy('goToStep').and.resolveTo();
    draft = signal<PuzzleExperience | null>(null);
    loading = signal(false);
    error = signal<string | null>(null);
    saving = signal(false);
    hasPendingChanges = signal(false);
    lastSavedAt = signal<Date | null>(null);
    currentStep = signal('occasion');
    stepCompletion = signal<WizardStepCompletion | null>(null);

    TestBed.configureTestingModule({
      imports: [WizardPage],
      providers: [
        provideRouter([]),
        {
          provide: PuzzleWizardFacade,
          useValue: {
            draft,
            loading,
            error,
            saving,
            hasPendingChanges,
            lastSavedAt,
            currentStep,
            stepCompletion,
            startNewDraft,
            loadDraft,
            goToStep,
            goNext: jasmine.createSpy('goNext').and.resolveTo(),
            goBack: jasmine.createSpy('goBack').and.resolveTo(),
          },
        },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(paramMapValues) } } },
      ],
    });

    fixture = TestBed.createComponent(WizardPage);
    page = fixture.componentInstance;
    router = TestBed.inject(Router);
    toast = TestBed.inject(ToastService);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    spyOn(router, 'navigate').and.resolveTo(true);
    spyOn(toast, 'error');
  }

  it('with no experienceId param, redirects to /creator', async () => {
    configure({});
    await page.ngOnInit();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/creator');
    expect(startNewDraft).not.toHaveBeenCalled();
  });

  it('with experienceId "new", starts a fresh draft and replaces the URL with the real id', async () => {
    configure({ experienceId: 'new' });
    await page.ngOnInit();

    expect(startNewDraft).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/creator/wizard', 'new-exp-id'], { replaceUrl: true });
  });

  it('with experienceId "new", shows an error toast and returns to the dashboard if starting a draft fails', async () => {
    configure({ experienceId: 'new' });
    startNewDraft.and.rejectWith(new Error('boom'));

    await page.ngOnInit();

    expect(toast.error).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/creator');
  });

  it('with a real experienceId, loads that draft', async () => {
    configure({ experienceId: 'exp_1' });
    await page.ngOnInit();
    expect(loadDraft).toHaveBeenCalledWith('exp_1');
  });

  it('hasUnsavedChanges delegates to the facade', () => {
    configure({ experienceId: 'exp_1' });
    hasPendingChanges.set(true);
    expect(page.hasUnsavedChanges()).toBeTrue();
  });

  it('onBeforeUnload prevents the default and sets returnValue only when there are pending changes', () => {
    configure({ experienceId: 'exp_1' });
    hasPendingChanges.set(true);

    const event = { preventDefault: jasmine.createSpy('preventDefault'), returnValue: '' } as unknown as BeforeUnloadEvent;
    page['onBeforeUnload'](event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.returnValue).toBe('');
  });

  it('onBeforeUnload does nothing when there are no pending changes', () => {
    configure({ experienceId: 'exp_1' });
    hasPendingChanges.set(false);

    const event = { preventDefault: jasmine.createSpy('preventDefault') } as unknown as BeforeUnloadEvent;
    page['onBeforeUnload'](event);

    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('onStepSelected delegates to wizardFacade.goToStep', () => {
    configure({ experienceId: 'exp_1' });
    page['onStepSelected']('questions');
    expect(goToStep).toHaveBeenCalledWith('questions');
  });

  describe('autosaveStatus', () => {
    beforeEach(() => configure({ experienceId: 'exp_1' }));

    it('shows "Saving…" while a save is in flight', () => {
      saving.set(true);
      expect(page['autosaveStatus']()).toBe('Saving…');
    });

    it('shows "Unsaved changes" when changes are pending and not currently saving', () => {
      hasPendingChanges.set(true);
      expect(page['autosaveStatus']()).toBe('Unsaved changes');
    });

    it('shows "Saved" once something has been saved and nothing is pending', () => {
      lastSavedAt.set(new Date());
      expect(page['autosaveStatus']()).toBe('Saved');
    });

    it('is empty before anything has been saved', () => {
      expect(page['autosaveStatus']()).toBe('');
    });
  });

  it('completedStepIds reflects the facade\'s stepCompletion', () => {
    configure({ experienceId: 'exp_1' });
    stepCompletion.set({ ...allIncomplete, occasion: true, image: true });

    expect(page['completedStepIds']()).toEqual(new Set(['occasion', 'image']));
  });

  it('completedStepIds is empty when stepCompletion is null', () => {
    configure({ experienceId: 'exp_1' });
    expect(page['completedStepIds']()).toEqual(new Set());
  });

  it('isFirstStep/isReviewStep reflect the current step', () => {
    configure({ experienceId: 'exp_1' });
    expect(page['isFirstStep']()).toBeTrue();
    expect(page['isReviewStep']()).toBeFalse();

    currentStep.set('review');
    expect(page['isFirstStep']()).toBeFalse();
    expect(page['isReviewStep']()).toBeTrue();
  });
});
