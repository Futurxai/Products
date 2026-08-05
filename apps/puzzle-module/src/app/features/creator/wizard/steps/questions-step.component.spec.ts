import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { PuzzleWizardFacade } from '@application/creator/puzzle-wizard.facade';
import { PuzzleExperience, draftExperience } from '@domain/models/puzzle-experience.model';
import { emptyQuestion } from '@domain/models/question.model';

import { QuestionsStepComponent } from './questions-step.component';

describe('QuestionsStepComponent', () => {
  let fixture: ComponentFixture<QuestionsStepComponent>;
  let draft: ReturnType<typeof signal<PuzzleExperience | null>>;

  function configure(questions: PuzzleExperience['questions'] = []): void {
    draft = signal<PuzzleExperience | null>({
      ...draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: 'Ananya' }),
      questions,
    });

    TestBed.configureTestingModule({
      imports: [QuestionsStepComponent],
      providers: [{ provide: PuzzleWizardFacade, useValue: { draft, updateQuestion: jasmine.createSpy() } }],
    });

    fixture = TestBed.createComponent(QuestionsStepComponent);
    fixture.detectChanges();
  }

  it('renders exactly 9 question editors, one per canonical question id', () => {
    configure();
    expect(fixture.nativeElement.querySelectorAll('app-question-editor').length).toBe(9);
  });

  it('readyCount is 0 for a fresh draft with no questions yet', () => {
    configure();
    expect(fixture.componentInstance['readyCount']()).toBe(0);
  });

  it('readyCount counts only questions that individually pass validation', () => {
    configure([
      { ...emptyQuestion('q1'), prompt: 'Q1?', correctAnswer: 'A1' },
      { ...emptyQuestion('q2'), prompt: 'Q2?', correctAnswer: '' }, // missing answer
      { ...emptyQuestion('q3'), prompt: 'Q3?', correctAnswer: 'A3' },
    ]);

    expect(fixture.componentInstance['readyCount']()).toBe(2);
  });
});
