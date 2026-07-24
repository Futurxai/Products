import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';

import { PuzzleSessionFacade } from '@application/recipient/puzzle-session.facade';
import { ButtonComponent } from '@shared/button/button.component';
import { LoaderComponent } from '@shared/loader/loader.component';

import { CompletionScreenComponent } from './ui/completion-screen.component';
import { PuzzleBoardComponent } from './ui/puzzle-board.component';
import { QuestionModalComponent } from './ui/question-modal.component';
import { WelcomeScreenComponent } from './ui/welcome-screen.component';

/**
 * The Recipient's ENTIRE app (M4) — deliberately the single route
 * `/e/:shareToken` (see `app.routes.ts`), with everything past that
 * (Welcome/Board/Question/Completion) handled as internal state
 * switching, not child routes. That was a Phase 4 Navigation spec
 * decision this page just implements: there is no URL to skip ahead
 * with (e.g. straight to `/e/:shareToken/completion` before actually
 * finishing), because no such URL exists.
 *
 * `shareToken` arrives via `withComponentInputBinding()` (`app.config.ts`)
 * — Angular sets it from the route param before `ngOnInit` runs, same
 * pattern the Creator pages use for `:experienceId`, just via signal
 * input instead of `ActivatedRoute.snapshot` since there's nothing else
 * this page needs from the route.
 *
 * No header, no back button — unlike every Creator page, this is not a
 * destination reached by in-app navigation; it's the whole page a
 * Recipient's browser opens.
 */
@Component({
  selector: 'app-experience-page',
  standalone: true,
  imports: [IonContent, LoaderComponent, ButtonComponent, WelcomeScreenComponent, PuzzleBoardComponent, QuestionModalComponent, CompletionScreenComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './experience.page.html',
  styleUrl: './experience.page.scss',
})
export class ExperiencePage implements OnInit {
  readonly shareToken = input('');

  protected readonly sessionFacade = inject(PuzzleSessionFacade);

  private readonly _hasStarted = signal(false);
  protected readonly hasStarted = this._hasStarted.asReadonly();

  async ngOnInit(): Promise<void> {
    const token = this.shareToken();
    if (!token) {
      return;
    }
    await this.sessionFacade.resolveLink(token);
  }

  protected onStartPuzzle(): void {
    this._hasStarted.set(true);
  }

  protected retryResolve(): void {
    void this.sessionFacade.resolveLink(this.shareToken());
  }
}
