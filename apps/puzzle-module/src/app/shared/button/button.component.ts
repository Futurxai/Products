import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IonButton, IonSpinner } from '@ionic/angular/standalone';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * The app's one button. A thin, opinionated wrapper around `ion-button`
 * rather than a hand-rolled `<button>` — Ionic already solved focus
 * rings, ripple feedback, and screen-reader semantics; reinventing that
 * would be strictly worse. What this adds: the product's own variant
 * vocabulary (`primary`/`secondary`/`ghost`/`danger` instead of Ionic's
 * `color`+`fill` pair), a `loading` state with a built-in spinner, and
 * `text-transform: none` — Ionic's `md` mode uppercases button text by
 * default, which reads as dated against the Phase 4 visual identity.
 *
 * `(click)` is not re-declared as an `@Output` — Angular binds it to
 * this component's host element natively, and clicks on a
 * disabled/loading inner `ion-button` never fire in the first place.
 */
@Component({
  selector: 'app-button',
  standalone: true,
  imports: [IonButton, IonSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-button
      [type]="type()"
      [color]="ionColor()"
      [fill]="ionFill()"
      [size]="ionSize()"
      [expand]="expand() === 'block' ? 'block' : undefined"
      [disabled]="disabled() || loading()"
      [attr.aria-busy]="loading() ? 'true' : null"
      class="app-button"
    >
      @if (loading()) {
        <ion-spinner name="crescent" slot="start" aria-hidden="true" class="app-button__spinner"></ion-spinner>
      }
      <ng-content></ng-content>
    </ion-button>
  `,
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit'>('button');
  readonly expand = input<'block' | 'inline'>('inline');
  readonly disabled = input(false);
  readonly loading = input(false);

  protected readonly ionColor = computed(() => (this.variant() === 'danger' ? 'danger' : this.variant() === 'secondary' ? 'secondary' : 'primary'));
  protected readonly ionFill = computed(() => (this.variant() === 'ghost' ? 'clear' : 'solid'));
  protected readonly ionSize = computed(() => (this.size() === 'sm' ? 'small' : this.size() === 'lg' ? 'large' : 'default'));
}
