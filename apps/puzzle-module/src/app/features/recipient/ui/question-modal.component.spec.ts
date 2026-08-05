import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { PuzzleSessionFacade } from '@application/recipient/puzzle-session.facade';
import { PieceProgress, lockedPiece } from '@domain/models/progress.model';
import { RecipientQuestionView } from '@domain/models/question.model';
import { ResolveShareTokenSuccess } from '@domain/ports/puzzle-api.port';

import { QuestionModalComponent } from './question-modal.component';

const question: RecipientQuestionView = { questionId: 'q1', prompt: 'Where did we first meet?' };

function publicMeta(): ResolveShareTokenSuccess['publicMeta'] {
  return {
    occasion: 'Anniversary',
    emotion: 'Love',
    recipientDisplayName: 'Ananya',
    welcomeNote: 'Hi!',
    status: 'published',
    lockedPatternImageUrl: 'https://x/pattern.svg',
    questions: [question],
    partnerHelpChallenge: 'Buy me ice cream',
  };
}

describe('QuestionModalComponent', () => {
  let fixture: ComponentFixture<QuestionModalComponent>;
  let activeQuestion: ReturnType<typeof signal<RecipientQuestionView | null>>;
  let activePiece: ReturnType<typeof signal<PieceProgress | null>>;
  let isActiveSolved: ReturnType<typeof signal<boolean>>;
  let lastPieceResolution: ReturnType<typeof signal<{ message: string; points: number } | null>>;
  let answerError: ReturnType<typeof signal<string | null>>;
  let submitting: ReturnType<typeof signal<boolean>>;
  let activeQuestionClues: ReturnType<typeof signal<readonly string[]>>;
  let canRequestClueForActive: ReturnType<typeof signal<boolean>>;
  let requestingClue: ReturnType<typeof signal<boolean>>;
  let clueError: ReturnType<typeof signal<string | null>>;
  let canRequestPartnerHelpForActive: ReturnType<typeof signal<boolean>>;
  let requestingPartnerHelp: ReturnType<typeof signal<boolean>>;
  let partnerHelpError: ReturnType<typeof signal<string | null>>;
  let submitAnswer: jasmine.Spy;
  let closeQuestion: jasmine.Spy;
  let requestClue: jasmine.Spy;
  let requestPartnerHelp: jasmine.Spy;

  function configure(): void {
    activeQuestion = signal<RecipientQuestionView | null>(question);
    activePiece = signal<PieceProgress | null>(lockedPiece());
    isActiveSolved = signal(false);
    lastPieceResolution = signal<{ message: string; points: number } | null>(null);
    answerError = signal<string | null>(null);
    submitting = signal(false);
    activeQuestionClues = signal<readonly string[]>([]);
    canRequestClueForActive = signal(true);
    requestingClue = signal(false);
    clueError = signal<string | null>(null);
    canRequestPartnerHelpForActive = signal(false);
    requestingPartnerHelp = signal(false);
    partnerHelpError = signal<string | null>(null);
    submitAnswer = jasmine.createSpy('submitAnswer').and.resolveTo(undefined);
    closeQuestion = jasmine.createSpy('closeQuestion');
    requestClue = jasmine.createSpy('requestClue').and.resolveTo(undefined);
    requestPartnerHelp = jasmine.createSpy('requestPartnerHelp').and.resolveTo(undefined);

    TestBed.configureTestingModule({
      imports: [QuestionModalComponent],
      providers: [
        {
          provide: PuzzleSessionFacade,
          useValue: {
            activeQuestion,
            activePiece,
            isActiveSolved,
            lastPieceResolution,
            answerError,
            submitting,
            activeQuestionClues,
            canRequestClueForActive,
            requestingClue,
            clueError,
            canRequestPartnerHelpForActive,
            requestingPartnerHelp,
            partnerHelpError,
            publicMeta: () => publicMeta(),
            submitAnswer,
            closeQuestion,
            requestClue,
            requestPartnerHelp,
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

  it('submits the entered answer via the facade — never a local correctness check', async () => {
    fixture.componentInstance['answerControl'].setValue('Fishermans Wharf');

    await fixture.componentInstance['onSubmit']();

    expect(submitAnswer).toHaveBeenCalledWith('Fishermans Wharf');
  });

  it('reaches onSubmit from a real DOM submit event, not just a direct method call (regression: a missing FormsModule import made (ngSubmit) silently never fire for a real click/Enter, even though this exact suite was green)', () => {
    fixture.componentInstance['answerControl'].setValue('Fishermans Wharf');

    const form = (fixture.nativeElement as HTMLElement).querySelector('form');
    expect(form).withContext('form must be in the rendered DOM').not.toBeNull();
    form!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();

    expect(submitAnswer).toHaveBeenCalledWith('Fishermans Wharf');
  });

  it('does not submit an empty answer', async () => {
    fixture.componentInstance['answerControl'].setValue('   ');
    await fixture.componentInstance['onSubmit']();
    expect(submitAnswer).not.toHaveBeenCalled();
  });

  it('does not submit while already submitting', async () => {
    submitting.set(true);
    fixture.componentInstance['answerControl'].setValue('anything');

    await fixture.componentInstance['onSubmit']();

    expect(submitAnswer).not.toHaveBeenCalled();
  });

  it('flags a wrong answer and clears the field for another attempt', async () => {
    fixture.componentInstance['answerControl'].setValue('nope');

    await fixture.componentInstance['onSubmit']();
    fixture.detectChanges();

    expect(fixture.componentInstance['wasJustWrong']()).toBeTrue();
    expect(fixture.componentInstance['answerControl'].value).toBe('');
  });

  it('shows the server business-failure message instead of the generic wrong-answer text, when present', async () => {
    answerError.set('Too many attempts — please wait.');
    fixture.componentInstance['answerControl'].setValue('guess');

    await fixture.componentInstance['onSubmit']();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Too many attempts — please wait.');
  });

  it('shows the solved view with the feedback message once the active piece is unlocked', () => {
    isActiveSolved.set(true);
    lastPieceResolution.set({ message: "You're awesome! 🎉", points: 100 });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain("You're awesome! 🎉");
    expect(text).toContain('+100 points');
  });

  it('falls back to a generic solved message when there is no cached submit outcome (e.g. resumed from an already-unlocked piece)', () => {
    isActiveSolved.set(true);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Piece unlocked!');
  });

  it('onContinue and onClosed both close the question', () => {
    fixture.componentInstance['onContinue']();
    expect(closeQuestion).toHaveBeenCalledTimes(1);

    fixture.componentInstance['onClosed']();
    expect(closeQuestion).toHaveBeenCalledTimes(2);
  });

  it('resets the answer field and wrong-answer flag when a new question becomes active', () => {
    fixture.componentInstance['wasJustWrong'].set(true);
    fixture.componentInstance['answerControl'].setValue('stale');

    activeQuestion.set({ questionId: 'q2', prompt: 'Another question' });
    fixture.detectChanges();

    expect(fixture.componentInstance['answerControl'].value).toBe('');
    expect(fixture.componentInstance['wasJustWrong']()).toBeFalse();
  });

  describe('clues', () => {
    it('requestClue delegates to the facade — never reads a locally-held clue bank', async () => {
      await fixture.componentInstance['onRequestClue']();
      expect(requestClue).toHaveBeenCalled();
    });

    it('shows no clue section when no clues have been used yet', () => {
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).not.toContain('Clues');
    });

    it('shows the revealed clue text and an X/3 counter once a clue has been used', () => {
      activePiece.set({ status: 'locked', earnedVia: null, cluesUsed: 1, pointsAwarded: 0 });
      activeQuestionClues.set(["It's near the water."]);
      fixture.detectChanges();

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain("It's near the water.");
      expect(text).toContain('1/3');
    });

    it('shows a fallback note when clues were used but the text was lost on reload', () => {
      activePiece.set({ status: 'locked', earnedVia: null, cluesUsed: 2, pointsAwarded: 0 });
      activeQuestionClues.set([]);
      fixture.detectChanges();

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('2/3');
      expect(text).toContain("isn't available after reloading");
    });

    it('hides the "Get a clue" button once the facade says no more clues are available', () => {
      canRequestClueForActive.set(false);
      fixture.detectChanges();

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).not.toContain('Get a clue');
    });

    it('shows a clue request error', () => {
      clueError.set('All 3 clues have already been used.');
      fixture.detectChanges();

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('All 3 clues have already been used.');
    });
  });

  describe('partner help', () => {
    it('hides the partner-help section until the facade says it is eligible', () => {
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).not.toContain('Ask Your Partner');
    });

    it('shows the challenge text and a WhatsApp share link once eligible', () => {
      canRequestPartnerHelpForActive.set(true);
      fixture.detectChanges();

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Ask Your Partner');
      expect(text).toContain('Buy me ice cream');

      const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.question-modal__whatsapp-link');
      expect(link).not.toBeNull();
      expect(link.href).toContain('wa.me');
      expect(decodeURIComponent(link.href)).toContain('Buy me ice cream');
    });

    it('requestPartnerHelp delegates to the facade — never resolves the piece locally', async () => {
      await fixture.componentInstance['onRequestPartnerHelp']();
      expect(requestPartnerHelp).toHaveBeenCalled();
    });

    it('shows a partner-help request error', () => {
      canRequestPartnerHelpForActive.set(true);
      partnerHelpError.set('Use all 3 clues first.');
      fixture.detectChanges();

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Use all 3 clues first.');
    });
  });
});
