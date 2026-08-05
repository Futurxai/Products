import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { PuzzleSessionFacade } from '@application/recipient/puzzle-session.facade';
import { CardComponent } from '@shared/card/card.component';
import { ButtonComponent } from '@shared/button/button.component';
import { LoaderComponent } from '@shared/loader/loader.component';

/**
 * Shown once `PuzzleSessionFacade.isComplete()` — the real Recipient's
 * final reveal (M4 Phase 7). Everything here comes from the
 * authoritative `getCompletionSummary` Cloud Function, fetched
 * automatically by the facade the instant completion is detected: the
 * final score, star rating/label, the Creator's completion message,
 * and — unlike anything shown during play — the full, unsliced reveal
 * image, signed fresh for this one response. There is no local
 * fallback and no restart: a real playthrough is a one-time event, not
 * a dry run (contrast with the Creator's own ephemeral
 * `preview/ui/completion-screen.component.ts`, which recomputes
 * everything locally and offers "Restart Preview").
 */
@Component({
  selector: 'app-completion-screen',
  standalone: true,
  imports: [CardComponent, ButtonComponent, LoaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './completion-screen.component.html',
  styleUrl: './completion-screen.component.scss',
})
export class CompletionScreenComponent {
  protected readonly sessionFacade = inject(PuzzleSessionFacade);

  protected readonly starDisplay = computed(() => {
    const rating = this.sessionFacade.completionSummary()?.starRating ?? 0;
    return '★'.repeat(rating) + '☆'.repeat(3 - rating);
  });

  protected retry(): void {
    void this.sessionFacade.loadCompletionSummary();
  }
}
