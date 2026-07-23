import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { PuzzleWizardFacade } from '@application/creator/puzzle-wizard.facade';
import { validateQuestion } from '@domain/rules/lifecycle.rules';
import { BadgeComponent } from '@shared/badge/badge.component';
import { ButtonComponent } from '@shared/button/button.component';
import { CardComponent } from '@shared/card/card.component';
import { ToastService } from '@shared/toast/toast.service';

/**
 * Step 6 — a read-only summary of everything entered, plus step
 * navigation (via the Stepper, already in `WizardPage`) and unsaved
 * change protection (the guard + `beforeunload` listener, both also on
 * `WizardPage`). "Preview experience" and "Publish" are both
 * deliberately inert beyond a toast — the immersive Preview (Feature 4)
 * and the actual publish flow (Feature 5) aren't built yet; wiring
 * either button to a route or Cloud Function that doesn't exist would
 * be worse than being honest about what's next.
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
  private readonly toast = inject(ToastService);

  protected readonly readyQuestionCount = computed(() => {
    const draft = this.wizardFacade.draft();
    return draft ? draft.questions.filter((question) => validateQuestion(question).ok).length : 0;
  });

  protected previewExperience(): void {
    this.toast.show('The Preview experience arrives in the next feature.', 'info');
  }

  protected publish(): void {
    this.toast.show('Publishing arrives in a later feature.', 'info');
  }
}
