import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { PuzzleWizardFacade } from '@application/creator/puzzle-wizard.facade';
import { PuzzleExperience, draftExperience } from '@domain/models/puzzle-experience.model';
import { emptyQuestion } from '@domain/models/question.model';

import { QuestionEditorComponent } from './question-editor.component';

describe('QuestionEditorComponent', () => {
  let fixture: ComponentFixture<QuestionEditorComponent>;
  let component: QuestionEditorComponent;
  let draft: ReturnType<typeof signal<PuzzleExperience | null>>;
  let updateQuestion: jasmine.Spy;

  function configure(existingQuestion = emptyQuestion('q1')): void {
    TestBed.resetTestingModule();
    updateQuestion = jasmine.createSpy('updateQuestion');
    draft = signal<PuzzleExperience | null>({
      ...draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: 'Ananya' }),
      questions: [existingQuestion],
    });

    TestBed.configureTestingModule({
      imports: [QuestionEditorComponent],
      providers: [{ provide: PuzzleWizardFacade, useValue: { draft, updateQuestion } }],
    });

    fixture = TestBed.createComponent(QuestionEditorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('questionId', 'q1');
    fixture.componentRef.setInput('index', 1);
    fixture.detectChanges();
  }

  beforeEach(() => configure());

  it('initializes the form and clues from the existing question', () => {
    configure({ ...emptyQuestion('q1'), prompt: 'Where did we meet?', correctAnswer: 'Cubbon Park', clues: ['Clue 1'] });

    expect(component['form'].value).toEqual({ prompt: 'Where did we meet?', correctAnswer: 'Cubbon Park' });
    expect(component['clues']()).toEqual(['Clue 1']);
  });

  it('does not call updateQuestion for the initial seed load', () => {
    configure({ ...emptyQuestion('q1'), prompt: 'Where did we meet?', correctAnswer: 'Cubbon Park' });
    expect(updateQuestion).not.toHaveBeenCalled();
  });

  it('falls back to an empty question when none exists yet for this id', () => {
    configure(emptyQuestion('q1'));
    expect(component['form'].value).toEqual({ prompt: '', correctAnswer: '' });
    expect(component['clues']()).toEqual([]);
  });

  it('calls updateQuestion with prompt/correctAnswer when the form changes', () => {
    component['form'].controls.prompt.setValue('Where did we meet?');
    expect(updateQuestion).toHaveBeenCalledWith('q1', { prompt: 'Where did we meet?', correctAnswer: '' });
  });

  it('addClue appends an empty clue and calls updateQuestion', () => {
    component['addClue']();
    expect(component['clues']()).toEqual(['']);
    expect(updateQuestion).toHaveBeenCalledWith('q1', { clues: [''] });
  });

  it('addClue does nothing once 3 clues already exist', () => {
    component['clues'].set(['a', 'b', 'c']);
    component['addClue']();
    expect(component['clues']()).toEqual(['a', 'b', 'c']);
  });

  it('updateClue edits the clue at the given index only', () => {
    component['clues'].set(['a', 'b']);
    component['updateClue'](1, 'edited');
    expect(component['clues']()).toEqual(['a', 'edited']);
    expect(updateQuestion).toHaveBeenCalledWith('q1', { clues: ['a', 'edited'] });
  });

  it('removeClue removes only the targeted clue', () => {
    component['clues'].set(['a', 'b', 'c']);
    component['removeClue'](1);
    expect(component['clues']()).toEqual(['a', 'c']);
  });

  it('validation reflects the live form + clues state, not just the initial question', () => {
    expect(component['validation']().ok).toBeFalse();

    component['form'].setValue({ prompt: 'Where did we meet?', correctAnswer: 'Cubbon Park' });
    expect(component['validation']().ok).toBeTrue();
  });

  it('validation fails once more than 3 clues are present', () => {
    component['form'].setValue({ prompt: 'Q', correctAnswer: 'A' });
    component['clues'].set(['a', 'b', 'c', 'd']);
    expect(component['validation']().ok).toBeFalse();
  });
});
