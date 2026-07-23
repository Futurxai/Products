import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { PuzzleWizardFacade } from '@application/creator/puzzle-wizard.facade';
import { PuzzleExperience, draftExperience } from '@domain/models/puzzle-experience.model';

import { OccasionEmotionStepComponent } from './occasion-emotion-step.component';

describe('OccasionEmotionStepComponent', () => {
  let fixture: ComponentFixture<OccasionEmotionStepComponent>;
  let component: OccasionEmotionStepComponent;
  let draft: ReturnType<typeof signal<PuzzleExperience | null>>;
  let updateOccasionEmotion: jasmine.Spy;

  beforeEach(() => {
    draft = signal<PuzzleExperience | null>(
      draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: '', recipientDisplayName: '' }),
    );
    updateOccasionEmotion = jasmine.createSpy('updateOccasionEmotion');

    TestBed.configureTestingModule({
      imports: [OccasionEmotionStepComponent],
      providers: [{ provide: PuzzleWizardFacade, useValue: { draft, updateOccasionEmotion } }],
    });

    fixture = TestBed.createComponent(OccasionEmotionStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows no errors before anything is touched', () => {
    expect(component['occasionError']).toBeNull();
    expect(component['emotionError']).toBeNull();
  });

  it('onOccasionChange calls updateOccasionEmotion with the new occasion and the existing emotion', () => {
    draft.set({ ...draft()!, emotion: 'Love' });

    component['onOccasionChange']({ detail: { value: 'Anniversary' } } as CustomEvent<{ value: string }>);

    expect(updateOccasionEmotion).toHaveBeenCalledWith('Anniversary', 'Love');
  });

  it('onEmotionChange calls updateOccasionEmotion with the existing occasion and the new emotion', () => {
    draft.set({ ...draft()!, occasion: 'Anniversary' });

    component['onEmotionChange']({ detail: { value: 'Love' } } as CustomEvent<{ value: string }>);

    expect(updateOccasionEmotion).toHaveBeenCalledWith('Anniversary', 'Love');
  });

  it('surfaces an error only after a change has been made and the field is still empty', () => {
    component['onEmotionChange']({ detail: { value: '' } } as CustomEvent<{ value: string }>);
    expect(component['occasionError']).toBe('Please select an occasion.');
  });
});
