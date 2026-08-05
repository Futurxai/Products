import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';

import { PuzzleWizardFacade } from '@application/creator/puzzle-wizard.facade';
import { PuzzleExperience, draftExperience } from '@domain/models/puzzle-experience.model';
import { emptyQuestion } from '@domain/models/question.model';

import { ReviewStepComponent } from './review-step.component';

describe('ReviewStepComponent', () => {
  let fixture: ComponentFixture<ReviewStepComponent>;
  let component: ReviewStepComponent;
  let router: Router;
  let flushNow: jasmine.Spy;

  function configure(overrides: Partial<PuzzleExperience> = {}): void {
    TestBed.resetTestingModule();
    const draft = signal<PuzzleExperience | null>({
      ...draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: 'Ananya' }),
      emotion: 'Love',
      welcomeNote: 'Hi Ananya!',
      ...overrides,
    });
    flushNow = jasmine.createSpy('flushNow').and.resolveTo();

    TestBed.configureTestingModule({
      imports: [ReviewStepComponent],
      providers: [provideRouter([]), { provide: PuzzleWizardFacade, useValue: { draft, flushNow } }],
    });

    fixture = TestBed.createComponent(ReviewStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
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

  it('previewExperience flushes pending autosave then navigates to the Preview route', async () => {
    await component['previewExperience']();
    expect(flushNow).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/creator/preview', 'exp_1']);
  });

  it('publish flushes pending autosave then navigates to the Publish route', async () => {
    await component['publish']();
    expect(flushNow).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/creator/publish', 'exp_1']);
  });
});
