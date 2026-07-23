import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { PuzzleWizardFacade } from '@application/creator/puzzle-wizard.facade';
import { PuzzleExperience, draftExperience } from '@domain/models/puzzle-experience.model';
import { emptyQuestion } from '@domain/models/question.model';
import { ToastService } from '@shared/toast/toast.service';

import { ReviewStepComponent } from './review-step.component';

describe('ReviewStepComponent', () => {
  let fixture: ComponentFixture<ReviewStepComponent>;
  let component: ReviewStepComponent;
  let toast: ToastService;

  function configure(overrides: Partial<PuzzleExperience> = {}): void {
    TestBed.resetTestingModule();
    const draft = signal<PuzzleExperience | null>({
      ...draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: 'Ananya' }),
      emotion: 'Love',
      welcomeNote: 'Hi Ananya!',
      ...overrides,
    });

    TestBed.configureTestingModule({
      imports: [ReviewStepComponent],
      providers: [{ provide: PuzzleWizardFacade, useValue: { draft } }],
    });

    fixture = TestBed.createComponent(ReviewStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    toast = TestBed.inject(ToastService);
    spyOn(toast, 'show');
  }

  beforeEach(() => configure());

  it('renders the occasion, emotion, and recipient', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Anniversary');
    expect(text).toContain('Love');
    expect(text).toContain('Ananya');
  });

  it('shows "Not yet uploaded" when there is no reveal image yet', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Not yet uploaded');
  });

  it('shows "Uploaded" once revealImagePath is set', () => {
    configure({ revealImagePath: 'puzzle_storage/cre_001/exp_1/reveal-image.jpg' });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Uploaded');
  });

  it('counts only individually-valid questions as ready', () => {
    configure({
      questions: [
        { ...emptyQuestion('q1'), prompt: 'Q1?', correctAnswer: 'A1' },
        { ...emptyQuestion('q2'), prompt: 'Q2?', correctAnswer: '' },
      ],
    });
    expect(component['readyQuestionCount']()).toBe(1);
  });

  it('previewExperience shows an informational toast instead of navigating anywhere', () => {
    component['previewExperience']();
    expect(toast.show).toHaveBeenCalledWith('The Preview experience arrives in the next feature.', 'info');
  });

  it('publish shows an informational toast instead of publishing anything', () => {
    component['publish']();
    expect(toast.show).toHaveBeenCalledWith('Publishing arrives in a later feature.', 'info');
  });
});
