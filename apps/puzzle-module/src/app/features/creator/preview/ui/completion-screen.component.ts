import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { PuzzlePreviewFacade } from '@application/creator/puzzle-preview.facade';
import { starLabelFor } from '@domain/rules/scoring.rules';
import { ButtonComponent } from '@shared/button/button.component';
import { CardComponent } from '@shared/card/card.component';

/**
 * Shown once `PuzzlePreviewFacade.isComplete()` — the final reveal
 * (the full board image, no longer masked by locked tiles) plus the
 * star rating, score, and the Creator's own `completionMessage`. Star
 * copy comes from `domain/rules/scoring.rules.ts`'s `starLabelFor`,
 * the same function `functions/src/application/get-completion-summary.usecase.ts`
 * (M2) uses for the real Recipient's completion summary — one source
 * for that copy, not two.
 */
@Component({
  selector: 'app-completion-screen',
  standalone: true,
  imports: [ButtonComponent, CardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './completion-screen.component.html',
  styleUrl: './completion-screen.component.scss',
})
export class CompletionScreenComponent {
  protected readonly previewFacade = inject(PuzzlePreviewFacade);

  protected readonly starLabel = computed(() => {
    const rating = this.previewFacade.score().starRating;
    return rating ? starLabelFor(rating) : '';
  });

  protected readonly starDisplay = computed(() => {
    const rating = this.previewFacade.score().starRating ?? 0;
    return '★'.repeat(rating) + '☆'.repeat(3 - rating);
  });

  protected restart(): void {
    this.previewFacade.restart();
  }
}
