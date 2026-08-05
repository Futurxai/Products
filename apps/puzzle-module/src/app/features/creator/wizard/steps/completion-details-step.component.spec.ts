import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { PuzzleWizardFacade } from '@application/creator/puzzle-wizard.facade';
import { PuzzleExperience, draftExperience } from '@domain/models/puzzle-experience.model';

import { CompletionDetailsStepComponent } from './completion-details-step.component';

describe('CompletionDetailsStepComponent', () => {
  let fixture: ComponentFixture<CompletionDetailsStepComponent>;
  let component: CompletionDetailsStepComponent;
  let updateCompletionDetails: jasmine.Spy;

  function configure(initial: Partial<PuzzleExperience> = {}): void {
    TestBed.resetTestingModule();
    updateCompletionDetails = jasmine.createSpy('updateCompletionDetails');
    const draft = signal<PuzzleExperience | null>({
      ...draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: 'Ananya' }),
      ...initial,
    });

    TestBed.configureTestingModule({
      imports: [CompletionDetailsStepComponent],
      providers: [{ provide: PuzzleWizardFacade, useValue: { draft, updateCompletionDetails } }],
    });

    fixture = TestBed.createComponent(CompletionDetailsStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => configure());

  it('initializes the form from the current draft', () => {
    configure({ partnerHelpChallenge: 'Ask Vikram', completionMessage: 'You did it!' });
    expect(component['form'].value).toEqual({ partnerHelpChallenge: 'Ask Vikram', completionMessage: 'You did it!' });
  });

  it('calls updateCompletionDetails whenever the form value changes', () => {
    component['form'].controls.partnerHelpChallenge.setValue('Ask Vikram');
    expect(updateCompletionDetails).toHaveBeenCalledWith('Ask Vikram', '');

    component['form'].controls.completionMessage.setValue('You did it!');
    expect(updateCompletionDetails).toHaveBeenCalledWith('Ask Vikram', 'You did it!');
  });

  it('shows an error only once a required field is touched and left empty', () => {
    expect(component['partnerHelpChallengeError']).toBeNull();
    component['form'].controls.partnerHelpChallenge.markAsTouched();
    expect(component['partnerHelpChallengeError']).toBe('A partner-help message is required.');
  });
});
