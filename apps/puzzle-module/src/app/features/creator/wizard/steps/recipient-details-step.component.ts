import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { PuzzleWizardFacade } from '@application/creator/puzzle-wizard.facade';
import { InputComponent } from '@shared/input/input.component';
import { TextareaComponent } from '@shared/textarea/textarea.component';

/** Step 3 — recipient name + welcome message, autosaved on every change. */
@Component({
  selector: 'app-recipient-details-step',
  standalone: true,
  imports: [ReactiveFormsModule, InputComponent, TextareaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipient-details-step.component.html',
  styleUrl: './recipient-details-step.component.scss',
})
export class RecipientDetailsStepComponent {
  protected readonly wizardFacade = inject(PuzzleWizardFacade);

  protected readonly form = new FormGroup({
    recipientDisplayName: new FormControl(this.wizardFacade.draft()?.recipientDisplayName ?? '', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    welcomeNote: new FormControl(this.wizardFacade.draft()?.welcomeNote ?? '', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.wizardFacade.updateRecipientDetails(value.recipientDisplayName ?? '', value.welcomeNote ?? '');
    });
  }

  protected get recipientNameError(): string | null {
    const control = this.form.controls.recipientDisplayName;
    return control.touched && control.invalid ? "Recipient's name is required." : null;
  }

  protected get welcomeNoteError(): string | null {
    const control = this.form.controls.welcomeNote;
    return control.touched && control.invalid ? 'A welcome message is required.' : null;
  }
}
