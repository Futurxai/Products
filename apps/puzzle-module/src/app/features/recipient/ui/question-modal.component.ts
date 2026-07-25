import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { PuzzleSessionFacade } from '@application/recipient/puzzle-session.facade';
import { MAX_CLUES_PER_QUESTION } from '@domain/models/constants';
import { BadgeComponent } from '@shared/badge/badge.component';
import { ButtonComponent } from '@shared/button/button.component';
import { InputComponent } from '@shared/input/input.component';
import { ModalComponent } from '@shared/modal/modal.component';

/**
 * The Recipient's question modal (M4 Phase 3) — answer entry,
 * correct/incorrect feedback, the unlocked-piece celebration. Structural
 * twin of the Creator's `preview/ui/question-modal.component.ts`, but
 * every gameplay decision below comes from a real `submitAnswer` Cloud
 * Function call via `PuzzleSessionFacade`, never a local check: this
 * component (and everything upstream of it) is never given a
 * `correctAnswer` to compare against in the first place (Module
 * Contract §8) — `activeQuestion()` here is a `RecipientQuestionView`,
 * a type that structurally cannot carry one.
 *
 * The clue ladder (M4 Phase 5) reveals text the server sends back —
 * never anything read from a locally-held `QuestionDefinition`, since
 * this client is never given one. "Ask Your Partner" (M4 Phase 6) is
 * resolved the same way, through the real `requestPartnerHelpReveal`
 * Cloud Function — `canRequestPartnerHelpForActive` only decides when
 * to show the button, the server decides whether the request succeeds.
 */
@Component({
  selector: 'app-question-modal',
  standalone: true,
  // `FormsModule` is required here even though the answer field itself is
  // bound via `[formControl]` (ReactiveFormsModule) — the plain
  // `<form (ngSubmit)="onSubmit()">` below has no `[formGroup]`, so it's
  // `FormsModule`'s `NgForm` directive (selector `form:not([formGroup])`)
  // that actually listens for the native `submit` event and emits
  // `ngSubmit`. Without it, `(ngSubmit)` binds to nothing and silently
  // never fires for a real click/Enter — caught by the end-to-end UAT
  // (`e2e/creator-to-recipient.spec.ts`), since the Karma spec calls
  // `onSubmit()` directly and never exercises the DOM event at all.
  imports: [FormsModule, ReactiveFormsModule, ModalComponent, ButtonComponent, InputComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './question-modal.component.html',
  styleUrl: './question-modal.component.scss',
})
export class QuestionModalComponent {
  protected readonly sessionFacade = inject(PuzzleSessionFacade);

  protected readonly answerControl = new FormControl('', { nonNullable: true });
  protected readonly wasJustWrong = signal(false);
  protected readonly maxClues = MAX_CLUES_PER_QUESTION;

  protected readonly isOpen = computed(() => this.sessionFacade.activeQuestion() !== null);
  protected readonly isSolved = this.sessionFacade.isActiveSolved;

  protected readonly wrongAnswerMessage = computed(() => {
    if (!this.wasJustWrong()) {
      return null;
    }
    const error = this.sessionFacade.answerError();
    return error ?? 'Not quite — try again.';
  });

  protected readonly solvedFeedback = this.sessionFacade.lastPieceResolution;

  protected readonly whatsappShareUrl = computed(() => {
    const challenge = this.sessionFacade.publicMeta()?.partnerHelpChallenge ?? '';
    return `https://wa.me/?text=${encodeURIComponent(challenge)}`;
  });

  constructor() {
    effect(
      () => {
        this.sessionFacade.activeQuestion(); // tracked: reset local UI state on every question change
        this.answerControl.reset('');
        this.wasJustWrong.set(false);
      },
      { allowSignalWrites: true },
    );
  }

  protected onClosed(): void {
    this.sessionFacade.closeQuestion();
  }

  protected async onSubmit(): Promise<void> {
    const answer = this.answerControl.value.trim();
    if (!answer || this.sessionFacade.submitting()) {
      return;
    }

    this.wasJustWrong.set(false);
    await this.sessionFacade.submitAnswer(answer);

    if (!this.isSolved()) {
      this.wasJustWrong.set(true);
      this.answerControl.reset('');
    }
  }

  protected onContinue(): void {
    this.sessionFacade.closeQuestion();
  }

  protected async onRequestClue(): Promise<void> {
    await this.sessionFacade.requestClue();
  }

  protected async onRequestPartnerHelp(): Promise<void> {
    await this.sessionFacade.requestPartnerHelp();
  }
}
