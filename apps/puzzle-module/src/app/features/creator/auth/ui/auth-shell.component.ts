import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { CardComponent } from '@shared/card/card.component';

/**
 * The shared visual frame for Login/Sign Up/Forgot Password — brand
 * header + a centered card. Feature-local (not `shared/`) on purpose:
 * this exact composition (logo, tagline, card, title/subtitle slot) is
 * specific to the auth flow's identity, not a general-purpose layout
 * the Wizard or Dashboard would also reach for.
 */
@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [CardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-shell">
      <div class="auth-shell__brand">
        <p class="auth-shell__logo">Love Digitally</p>
        <p class="auth-shell__tagline">Puzzle Module</p>
      </div>
      <app-card class="auth-shell__card">
        <h1 class="auth-shell__title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="auth-shell__subtitle">{{ subtitle() }}</p>
        }
        <ng-content></ng-content>
      </app-card>
    </div>
  `,
  styleUrl: './auth-shell.component.scss',
})
export class AuthShellComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
