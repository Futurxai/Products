import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { PuzzlePreviewFacade } from '@application/creator/puzzle-preview.facade';
import { AnswerAttemptOutcome } from '@domain/rules/gameplay.rules';
import { PieceProgress, lockedPiece } from '@domain/models/progress.model';
import { PuzzleExperience, draftExperience } from '@domain/models/puzzle-experience.model';
import { QuestionDefinition } from '@domain/models/question.model';

import { QuestionModalComponent } from './question-modal.component';

const question: QuestionDefinition = {
  questionId: 'q1',
  prompt: 'Where did we first meet?',
  correctAnswer: 'Fishermans Wharf',
  acceptedVariants: [],
  clues: ['clue 1', 'clue 2', 'clue 3'],
};

describe('QuestionModalComponent', () => {
  let fixture: ComponentFixture<QuestionModalComponent>;
  let activeQuestion: ReturnType<typeof signal<QuestionDefinition | null>>;
  let activePiece: ReturnType<typeof signal<PieceProgress | null>>;
  let activeQuestionClues: ReturnType<typeof signal<readonly string[]>>;
  let canRequestClueForActive: ReturnType<typeof signal<boolean>>;
  let canRequestPartnerHelpForActive: ReturnType<typeof signal<boolean>>;
  let lastFeedback: ReturnType<typeof signal<{ tier: string; message: string } | null>>;
  let experience: ReturnType<typeof signal<PuzzleExperience | null>>;
  let submitAnswer: jasmine.Spy;
  let requestClue: jasmine.Spy;
  let requestPartnerHelp: jasmine.Spy;
  let closeQuestion: jasmine.Spy;

  function configure(): void {
    activeQuestion = signal<QuestionDefinition | null>(question);
    activePiece = signal<PieceProgress | null>(lockedPiece());
    activeQuestionClues = signal<readonly string[]>([]);
    canRequestClueForActive = signal(true);
    canRequestPartnerHelpForActive = signal(false);
    lastFeedback = signal<{ tier: string; message: string } | null>(null);
    experience = signal<PuzzleExperience | null>(
      draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: 'Ananya' }),
    );
    submitAnswer = jasmine.createSpy('submitAnswer');
    requestClue = jasmine.createSpy('requestClue');
    requestPartnerHelp = jasmine.createSpy('requestPartnerHelp');
    closeQuestion = jasmine.createSpy('closeQuestion');

    TestBed.configureTestingModule({
      imports: [QuestionModalComponent],
      providers: [
        {
          provide: PuzzlePreviewFacade,
          useValue: {
            activeQuestion,
            activePiece,
            activeQuestionClues,
            canRequestClueForActive,
            canRequestPartnerHelpForActive,
            lastFeedback,
            experience,
            submitAnswer,
            requestClue,
            requestPartnerHelp,
            closeQuestion,
          },
        },
      ],
    });

    fixture = TestBed.createComponent(QuestionModalComponent);
    fixture.detectChanges();
  }

  beforeEach(() => configure());

  it('shows the question prompt and an empty answer field when a question is active', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Where did we first meet?');
  });

  it('submits the entered answer via the facade', () => {
    submitAnswer.and.returnValue({ correct: true } as AnswerAttemptOutcome);
    fixture.componentInstance['answerControl'].setValue('Fishermans Wharf');

    fixture.componentInstance['onSubmit']();

    expect(submitAnswer).toHaveBeenCalledWith('Fishermans Wharf');
  });

  it('reaches onSubmit from a real DOM submit event, not just a direct method call (regression: a missing FormsModule import made (ngSubmit) silently never fire for a real click/Enter, even though this exact suite was green)', () => {
    submitAnswer.and.returnValue({ correct: true } as AnswerAttemptOutcome);
    fixture.componentInstance['answerControl'].setValue('Fishermans Wharf');

    const form = (fixture.nativeElement as HTMLElement).querySelector('form');
    expect(form).withContext('form must be in the rendered DOM').not.toBeNull();
    form!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();

    expect(submitAnswer).toHaveBeenCalledWith('Fishermans Wharf');
  });

  it('does not submit an empty answer', () => {
    fixture.componentInstance['answerControl'].setValue('   ');
    fixture.componentInstance['onSubmit']();
    expect(submitAnswer).not.toHaveBeenCalled();
  });

  it('flags a wrong answer and clears the field for another attempt', () => {
    submitAnswer.and.returnValue({ correct: false, clueAvailable: true, cluesUsedSoFar: 0, partnerHelpAvailable: false } as AnswerAttemptOutcome);
    fixture.componentInstance['answerControl'].setValue('nope');

    fixture.componentInstance['onSubmit']();
    fixture.detectChanges();

    expect(fixture.componentInstance['wrongAnswer']()).toBeTrue();
    expect(fixture.componentInstance['answerControl'].value).toBe('');
  });

  it('shows the solved view with the feedback message once the active piece is unlocked', () => {
    activePiece.set({ status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 });
    lastFeedback.set({ tier: 'youre_awesome', message: "You're awesome! 🎉" });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain("You're awesome! 🎉");
    expect(text).toContain('+100 points');
  });

  it('onContinue closes the question', () => {
    fixture.componentInstance['onContinue']();
    expect(closeQuestion).toHaveBeenCalled();
  });

  it('requestClue delegates to the facade', () => {
    fixture.componentInstance['onRequestClue']();
    expect(requestClue).toHaveBeenCalled();
  });

  it('shows the partner-help challenge and WhatsApp link once eligible', () => {
    canRequestPartnerHelpForActive.set(true);
    fixture.detectChanges();

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.question-modal__whatsapp-link');
    expect(link).not.toBeNull();
    expect(link.href).toContain('wa.me');
  });

  it('requestPartnerHelp delegates to the facade', () => {
    fixture.componentInstance['onRequestPartnerHelp']();
    expect(requestPartnerHelp).toHaveBeenCalled();
  });

  it('resets the answer field and wrong-answer flag when a new question becomes active', () => {
    fixture.componentInstance['wrongAnswer'].set(true);
    fixture.componentInstance['answerControl'].setValue('stale');

    activeQuestion.set({ ...question, questionId: 'q2' });
    fixture.detectChanges();

    expect(fixture.componentInstance['answerControl'].value).toBe('');
    expect(fixture.componentInstance['wrongAnswer']()).toBeFalse();
  });
});
