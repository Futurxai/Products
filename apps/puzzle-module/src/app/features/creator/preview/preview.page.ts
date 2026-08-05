import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

import { PuzzlePreviewFacade } from '@application/creator/puzzle-preview.facade';
import { LoaderComponent } from '@shared/loader/loader.component';

import { CompletionScreenComponent } from './ui/completion-screen.component';
import { PuzzleBoardComponent } from './ui/puzzle-board.component';
import { QuestionModalComponent } from './ui/question-modal.component';

/**
 * The Puzzle Preview (M3 Feature 4) — a Creator playing through their
 * own draft exactly as a Recipient would, via `PuzzlePreviewFacade`'s
 * entirely local, ephemeral session. Routed at
 * `/creator/preview/:experienceId`, reached from the Wizard's Review
 * step. "Back" returns to that same experience's Review step, not the
 * Dashboard — Preview is a detour from the Wizard, not a separate
 * destination.
 */
@Component({
  selector: 'app-preview-page',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    LoaderComponent,
    PuzzleBoardComponent,
    QuestionModalComponent,
    CompletionScreenComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './preview.page.html',
  styleUrl: './preview.page.scss',
})
export class PreviewPage implements OnInit {
  protected readonly previewFacade = inject(PuzzlePreviewFacade);
  private readonly route = inject(ActivatedRoute);

  private readonly experienceId = signal<string | null>(null);
  protected readonly backHref = computed(() => (this.experienceId() ? `/creator/wizard/${this.experienceId()}` : '/creator'));

  async ngOnInit(): Promise<void> {
    const experienceId = this.route.snapshot.paramMap.get('experienceId');
    this.experienceId.set(experienceId);
    if (!experienceId) {
      return;
    }
    await this.previewFacade.start(experienceId);
  }
}
