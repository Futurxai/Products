import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { AvatarComponent } from '@shared/avatar/avatar.component';
import { ButtonComponent } from '@shared/button/button.component';

/**
 * The first thing a Recipient sees after their link resolves (M4 Phase
 * 2) — before any gameplay, before any pressure to "perform." Purely
 * presentational: `PuzzleSessionFacade.publicMeta()` already carries
 * everything it needs, fed in as inputs rather than injecting the
 * facade directly, so this stays trivially testable and reusable if the
 * eventual page shell (Phase 8) ever needs to render it in more than
 * one place.
 *
 * The avatar shows the RECIPIENT's own initials
 * (`recipientDisplayName`), not the Creator's — this module has never
 * been designed to expose creator identity to a recipient (Module
 * Contract §8 is about gameplay data, but the same instinct applies
 * here: a Recipient should feel personally welcomed, not told who sent
 * this).
 */
@Component({
  selector: 'app-welcome-screen',
  standalone: true,
  imports: [AvatarComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './welcome-screen.component.html',
  styleUrl: './welcome-screen.component.scss',
})
export class WelcomeScreenComponent {
  readonly recipientDisplayName = input.required<string>();
  readonly occasion = input.required<string>();
  readonly welcomeNote = input.required<string>();

  readonly startPuzzle = output<void>();

  protected onStart(): void {
    this.startPuzzle.emit();
  }
}
