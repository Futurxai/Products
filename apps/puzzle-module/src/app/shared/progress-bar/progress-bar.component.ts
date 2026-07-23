import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IonProgressBar } from '@ionic/angular/standalone';

/**
 * A thin wrapper over `ion-progress-bar` taking `value`/`max` (e.g.
 * "6 of 9 questions ready") rather than Ionic's raw 0–1 fraction —
 * callers shouldn't have to do that division themselves everywhere.
 */
@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [IonProgressBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-progress-bar
      [value]="fraction()"
      [attr.aria-label]="label() || null"
      [attr.aria-valuetext]="value() + ' of ' + max()"
    ></ion-progress-bar>
    @if (label()) {
      <p class="app-progress-bar__label">{{ label() }}</p>
    }
  `,
  styleUrl: './progress-bar.component.scss',
})
export class ProgressBarComponent {
  readonly value = input.required<number>();
  readonly max = input.required<number>();
  readonly label = input('');

  protected readonly fraction = computed(() => (this.max() > 0 ? Math.min(1, Math.max(0, this.value() / this.max())) : 0));
}
