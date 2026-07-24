import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { PuzzleSessionFacade } from '@application/recipient/puzzle-session.facade';
import { QUESTION_IDS } from '@domain/models/constants';
import { ProgressBarComponent } from '@shared/progress-bar/progress-bar.component';

/**
 * The 3×3 locked/unlocked board (M4 Phase 3) — the real Recipient
 * equivalent of the Creator's `preview/ui/puzzle-board.component.ts`,
 * but built on genuinely different data: Preview slices ONE full board
 * image client-side (legitimate only because a Creator previewing
 * their own draft already knows the whole picture); here, every
 * unlocked tile renders its OWN already-cropped, individually
 * signed-URL image (`PuzzleSessionFacade.pieceImageFor`) — the only
 * pixel data this client is ever handed, and only after a piece is
 * confirmed earned (Module Contract §8). There is no full board image
 * to slice; nothing here could reveal an unearned piece even by
 * accident.
 *
 * Locked tiles show the Creator-authored decorative
 * `lockedPatternImageUrl` (same asset for every locked piece) rather
 * than Preview's plain lock glyph — real recipient-facing chrome, not
 * a dry run.
 *
 * The progress bar/score line beneath the grid (M4 Phase 4) reads
 * `PuzzleSessionFacade.score()`, itself `computeScore()` over the same
 * realtime `puzzle_progress` data the grid renders — one source for
 * both, no separate counter to drift out of sync.
 */
@Component({
  selector: 'app-puzzle-board',
  standalone: true,
  imports: [ProgressBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './puzzle-board.component.html',
  styleUrl: './puzzle-board.component.scss',
})
export class PuzzleBoardComponent {
  protected readonly sessionFacade = inject(PuzzleSessionFacade);
  protected readonly questionIds = QUESTION_IDS;

  /**
   * Hoisted out of the template (M5 Phase 2 perf pass) — the same one
   * value backs up to 9 locked tiles; reading `publicMeta()` and
   * re-concatenating the `url(...)` string separately per tile, per
   * change-detection run, was wasted work for a value that never
   * differs between tiles.
   */
  protected readonly lockedPatternStyle = computed(() => {
    const url = this.sessionFacade.publicMeta()?.lockedPatternImageUrl;
    return url ? `url(${url})` : null;
  });

  protected isUnlocked(questionId: string): boolean {
    return this.sessionFacade.pieceFor(questionId).status === 'unlocked';
  }

  protected onTileClick(questionId: string): void {
    this.sessionFacade.openQuestion(questionId);
  }
}
