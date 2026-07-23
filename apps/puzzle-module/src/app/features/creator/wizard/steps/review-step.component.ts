import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { PuzzleWizardFacade } from '@application/creator/puzzle-wizard.facade';
import { validateQuestion } from '@domain/rules/lifecycle.rules';
import { BadgeComponent } from '@shared/badge/badge.component';
import { ButtonComponent } from '@shared/button/button.component';
import { CardComponent } from '@shared/card/card.component';

/**
 * Step 6 — a read-only summary of everything entered, plus step
 * navigation (via the Stepper, already in `WizardPage`) and unsaved
 * change protection (the guard + `beforeunload` listener, both also on
 * `WizardPage`). Both "Preview experience" and "Publish" flush any
 * pending autosave first, then navigate to the real Puzzle Preview
 * (M3 Feature 4) or Publish & Share (M3 Feature 5) — neither is a
 * placeholder toast anymore.
 */
@Component({
  selector: 'app-review-step',
  standalone: true,
  imports: [CardComponent, BadgeComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './review-step.component.html',
  styleUrl: './review-step.component.scss',
})
export class ReviewStepComponent {
  protected readonly wizardFacade = inject(PuzzleWizardFacade);
  private readonly router = inject(Router);

  protected readonly readyQuestionCount = computed(() => {
    const draft = this.wizardFacade.draft();
    return draft ? draft.questions.filter((question) => validateQuestion(question).ok).length : 0;
  });

  protected async previewExperience(): Promise<void> {
    const draft = this.wizardFacade.draft();
    if (!draft) {
      return;
    }
    await this.wizardFacade.flushNow();
    await this.router.navigate(['/creator/preview', draft.experienceId]);
  }

  protected async publish(): Promise<void> {
    const draft = this.wizardFacade.draft();
    if (!draft) {
      return;
    }
    await this.wizardFacade.flushNow();
    await this.router.navigate(['/creator/publish', draft.experienceId]);
  }
}
