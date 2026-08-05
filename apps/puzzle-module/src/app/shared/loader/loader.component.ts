import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IonSpinner } from '@ionic/angular/standalone';

export type LoaderSize = 'sm' | 'md' | 'lg';

/**
 * Page/section-level loading indicator — distinct from `ButtonComponent`'s
 * own built-in spinner, which covers the narrower "this one action is in
 * flight" case. Used for things like "still restoring your session" while
 * `AuthFacade.authReady()` is false.
 */
@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [IonSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-loader" [class.app-loader--overlay]="overlay()" role="status" [attr.aria-label]="label() || 'Loading'">
      <ion-spinner name="crescent" [style.width.px]="pixelSize()" [style.height.px]="pixelSize()" aria-hidden="true"></ion-spinner>
      @if (label()) {
        <p class="app-loader__label">{{ label() }}</p>
      }
    </div>
  `,
  styleUrl: './loader.component.scss',
})
export class LoaderComponent {
  readonly size = input<LoaderSize>('md');
  readonly label = input('');
  /** Renders as a fixed, full-viewport backdrop instead of inline flow. */
  readonly overlay = input(false);

  protected readonly pixelSize = computed(() => (this.size() === 'sm' ? 20 : this.size() === 'lg' ? 48 : 32));
}
