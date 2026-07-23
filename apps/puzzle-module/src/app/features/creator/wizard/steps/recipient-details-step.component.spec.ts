import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { PuzzleWizardFacade } from '@application/creator/puzzle-wizard.facade';
import { PuzzleExperience, draftExperience } from '@domain/models/puzzle-experience.model';

import { RecipientDetailsStepComponent } from './recipient-details-step.component';

describe('RecipientDetailsStepComponent', () => {
  let fixture: ComponentFixture<RecipientDetailsStepComponent>;
  let component: RecipientDetailsStepComponent;
  let updateRecipientDetails: jasmine.Spy;

  function configure(initial: Partial<PuzzleExperience> = {}): void {
    TestBed.resetTestingModule();
    updateRecipientDetails = jasmine.createSpy('updateRecipientDetails');
    const draft = signal<PuzzleExperience | null>({
      ...draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: '' }),
      ...initial,
    });

    TestBed.configureTestingModule({
      imports: [RecipientDetailsStepComponent],
      providers: [{ provide: PuzzleWizardFacade, useValue: { draft, updateRecipientDetails } }],
    });

    fixture = TestBed.createComponent(RecipientDetailsStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => configure());

  it('initializes the form from the current draft', () => {
    configure({ recipientDisplayName: 'Ananya', welcomeNote: 'Hi!' });
    expect(component['form'].value).toEqual({ recipientDisplayName: 'Ananya', welcomeNote: 'Hi!' });
  });

  it('calls updateRecipientDetails whenever the form value changes', () => {
    component['form'].controls.recipientDisplayName.setValue('Ananya');
    expect(updateRecipientDetails).toHaveBeenCalledWith('Ananya', '');

    component['form'].controls.welcomeNote.setValue('Hi Ananya!');
    expect(updateRecipientDetails).toHaveBeenCalledWith('Ananya', 'Hi Ananya!');
  });

  it('shows no errors before the fields are touched', () => {
    expect(component['recipientNameError']).toBeNull();
    expect(component['welcomeNoteError']).toBeNull();
  });

  it('shows an error once a required field is touched and left empty', () => {
    component['form'].controls.recipientDisplayName.markAsTouched();
    expect(component['recipientNameError']).toBe("Recipient's name is required.");
  });
});
