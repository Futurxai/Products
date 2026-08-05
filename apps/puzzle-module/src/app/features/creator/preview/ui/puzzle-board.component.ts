import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { PuzzlePreviewFacade } from '@application/creator/puzzle-preview.facade';
import { QUESTION_IDS } from '@domain/models/constants';
import { ProgressBarComponent } from '@shared/progress-bar/progress-bar.component';

/**
 * The 3×3 locked/unlocked board. Locked tiles show a simple CSS lock
 * glyph rather than fetching `lockedPatternImagePath` from Storage — a
 * decorative, non-scored asset shared across every experience, not
 * worth a new Storage read path for. Unlocked tiles reveal their cell
 * of `PuzzlePreviewFacade.boardImageUrl()` via CSS background-position
 * slicing: the underlying image is always a square 1200×1200 (the
 * Wizard's cropper guarantees this, M3 Feature 3), so a uniform
 * `background-size: 300% 300%` with 0/50/100% position steps divides
 * it into 9 equal cells with no aspect-ratio math needed.
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
  protected readonly previewFacade = inject(PuzzlePreviewFacade);
  protected readonly questionIds = QUESTION_IDS;

  protected isUnlocked(questionId: string): boolean {
    return this.previewFacade.pieceFor(questionId).status === 'unlocked';
  }

  protected tileStyle(index: number): Record<string, string> {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const imageUrl = this.previewFacade.boardImageUrl();
    if (!imageUrl) {
      return {};
    }
    return {
      'background-image': `url(${imageUrl})`,
      'background-position': `${col * 50}% ${row * 50}%`,
    };
  }

  protected onTileClick(questionId: string): void {
    this.previewFacade.openQuestion(questionId);
  }
}
