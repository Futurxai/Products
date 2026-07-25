import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { PuzzlePreviewFacade } from '@application/creator/puzzle-preview.facade';
import { BadgeComponent } from '@shared/badge/badge.component';
import { ButtonComponent } from '@shared/button/button.component';
import { InputComponent } from '@shared/input/input.component';
import { ModalComponent } from '@shared/modal/modal.component';

/**
 * The question modal — answer entry, correct/incorrect feedback, the
 * clue ladder, and the "Ask Your Partner" fallback once clues are
 * exhausted. One instance lives in `PreviewPage`, toggled open/closed
 * by `PuzzlePreviewFacade.activeQuestion()`; local state (the answer
 * field, the "wrong answer" flag) is reset via the `effect` below
 * whenever the active question id changes, since the component
 * instance itself persists across different questions being opened.
 *
 * "Solved" (correct answer OR partner-help reveal) is derived from
 * `activePiece()?.status === 'unlocked'` rather than tracked as a
 * second local flag — both paths already flow through the facade and
 * end in the same unlocked state, so there's exactly one source of
 * truth for "is this question done."
 */
@Component({
  selector: 'app-question-modal',
  standalone: true,
  // `FormsModule` is required — the plain `<form (ngSubmit)="onSubmit()">`
  // below has no `[formGroup]`, so it's `FormsModule`'s `NgForm` directive
  // (selector `form:not([formGroup])`) that listens for the native
  // `submit` event and emits `ngSubmit`; without it, `(ngSubmit)` binds to
  // nothing. Same bug as the Recipient's real `question-modal.component.ts`
  // (this one's structural twin), found via that one's end-to-end UAT
  // (`e2e/creator-to-recipient.spec.ts`) and fixed here too since the cause
  // is identical.
  imports: [FormsModule, ReactiveFormsModule, ModalComponent, ButtonComponent, InputComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './question-modal.component.html',
  styleUrl: './question-modal.component.scss',
})
export class QuestionModalComponent {
  protected readonly previewFacade = inject(PuzzlePreviewFacade);

  protected readonly answerControl = new FormControl('', { nonNullable: true });
  protected readonly wrongAnswer = signal(false);

  protected readonly isOpen = computed(() => this.previewFacade.activeQuestion() !== null);
  protected readonly isSolved = computed(() => this.previewFacade.activePiece()?.status === 'unlocked');

  protected readonly whatsappShareUrl = computed(() => {
    const challenge = this.previewFacade.experience()?.partnerHelpChallenge ?? '';
    return `https://wa.me/?text=${encodeURIComponent(challenge)}`;
  });

  constructor() {
    effect(
      () => {
        this.previewFacade.activeQuestion(); // tracked: reset local UI state on every question change
        this.answerControl.reset('');
        this.wrongAnswer.set(false);
      },
      { allowSignalWrites: true },
    );
  }

  protected onClosed(): void {
    this.previewFacade.closeQuestion();
  }

  protected onSubmit(): void {
    const answer = this.answerControl.value.trim();
    if (!answer) {
      return;
    }
    const outcome = this.previewFacade.submitAnswer(answer);
    if (!outcome) {
      return;
    }
    this.wrongAnswer.set(!outcome.correct);
    if (!outcome.correct) {
      this.answerControl.reset('');
    }
  }

  protected onRequestClue(): void {
    this.previewFacade.requestClue();
  }

  protected onRequestPartnerHelp(): void {
    this.previewFacade.requestPartnerHelp();
  }

  protected onContinue(): void {
    this.previewFacade.closeQuestion();
  }
}
