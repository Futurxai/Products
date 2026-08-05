import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { PuzzleWizardFacade } from '@application/creator/puzzle-wizard.facade';
import { MAX_CLUES_PER_QUESTION } from '@domain/models/constants';
import { emptyQuestion } from '@domain/models/question.model';
import { ValidationResult, validateQuestion } from '@domain/rules/lifecycle.rules';
import { BadgeComponent } from '@shared/badge/badge.component';
import { ButtonComponent } from '@shared/button/button.component';
import { InputComponent } from '@shared/input/input.component';

/**
 * One question/answer/clues editor within Step 4. Injects
 * `PuzzleWizardFacade` directly and owns exactly one question
 * (`questionId`, stable for the component's lifetime — q1..q9 never
 * change identity) rather than receiving the question as a
 * parent-controlled `@Input`. That sidesteps a real controlled-input
 * pitfall: if the parent echoed the facade's updated draft back down
 * as a prop and this component reset its form from it on every
 * change, retyping the *current* keystroke's value back into the form
 * risks jank (cursor jumps) for no benefit, since nothing else ever
 * changes this question's data out from under it.
 */
@Component({
  selector: 'app-question-editor',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, InputComponent, ButtonComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './question-editor.component.html',
  styleUrl: './question-editor.component.scss',
})
export class QuestionEditorComponent implements OnInit {
  @Input({ required: true }) questionId!: string;
  @Input() index = 0;

  protected readonly wizardFacade = inject(PuzzleWizardFacade);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly maxClues = MAX_CLUES_PER_QUESTION;
  protected readonly clues = signal<readonly string[]>([]);

  protected readonly form = new FormGroup({
    prompt: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    correctAnswer: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  private formInitialized = false;

  protected readonly validation = computed<ValidationResult>(() => {
    const value = this.formValue();
    return validateQuestion({
      questionId: this.questionId,
      prompt: value.prompt ?? '',
      correctAnswer: value.correctAnswer ?? '',
      acceptedVariants: [],
      clues: this.clues(),
    });
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      if (!this.formInitialized) {
        return; // the seed load in ngOnInit also emits — that's not a creator edit, don't autosave it
      }
      this.wizardFacade.updateQuestion(this.questionId, { prompt: value.prompt ?? '', correctAnswer: value.correctAnswer ?? '' });
    });
  }

  ngOnInit(): void {
    const existing = this.currentQuestion();
    this.form.setValue({ prompt: existing.prompt, correctAnswer: existing.correctAnswer });
    this.clues.set([...existing.clues]);
    this.formInitialized = true;
  }

  protected addClue(): void {
    if (this.clues().length >= this.maxClues) {
      return;
    }
    this.setClues([...this.clues(), '']);
  }

  protected updateClue(index: number, value: string): void {
    this.setClues(this.clues().map((clue, i) => (i === index ? value : clue)));
  }

  protected removeClue(index: number): void {
    this.setClues(this.clues().filter((_, i) => i !== index));
  }

  private setClues(next: readonly string[]): void {
    this.clues.set(next);
    this.wizardFacade.updateQuestion(this.questionId, { clues: next });
  }

  private currentQuestion() {
    return (
      this.wizardFacade.draft()?.questions.find((question) => question.questionId === this.questionId) ??
      emptyQuestion(this.questionId)
    );
  }
}
