import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { PuzzleWizardFacade } from '@application/creator/puzzle-wizard.facade';
import { TextareaComponent } from '@shared/textarea/textarea.component';

/** Step 5 — the partner-help challenge and completion message, autosaved on every change. */
@Component({
  selector: 'app-completion-details-step',
  standalone: true,
  imports: [ReactiveFormsModule, TextareaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './completion-details-step.component.html',
  styleUrl: './completion-details-step.component.scss',
})
export class CompletionDetailsStepComponent {
  protected readonly wizardFacade = inject(PuzzleWizardFacade);

  protected readonly form = new FormGroup({
    partnerHelpChallenge: new FormControl(this.wizardFacade.draft()?.partnerHelpChallenge ?? '', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    completionMessage: new FormControl(this.wizardFacade.draft()?.completionMessage ?? '', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.wizardFacade.updateCompletionDetails(value.partnerHelpChallenge ?? '', value.completionMessage ?? '');
    });
  }

  protected get partnerHelpChallengeError(): string | null {
    const control = this.form.controls.partnerHelpChallenge;
    return control.touched && control.invalid ? 'A partner-help message is required.' : null;
  }

  protected get completionMessageError(): string | null {
    const control = this.form.controls.completionMessage;
    return control.touched && control.invalid ? 'A completion message is required.' : null;
  }
}
