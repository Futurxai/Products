import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonModal } from '@ionic/angular/standalone';

/**
 * A generic overlay wrapper around `ion-modal` — deferred since
 * Feature 1 (see `shared/README.md`) until a real consumer needed one;
 * the Puzzle Preview's Question modal (M3 Feature 4) is that consumer.
 * Content is projected via `<ng-content>`, same pattern as
 * `CardComponent`, so callers own their own header/body/footer layout
 * rather than this component prescribing one.
 *
 * Accessibility comes from Ionic's own modal implementation, not
 * hand-rolled here: focus trap and ESC-to-close are on by default
 * (`focusTrap`/`keyboardClose`), and `role="dialog"`/`aria-modal` are
 * set explicitly since `ion-modal`'s projected content is otherwise
 * just a plain div to assistive tech.
 *
 * `keepContentsMounted` is on deliberately: without it, `ion-modal`
 * only instantiates its `<ng-template>` content once actually
 * presented (an animated overlay transition), which would reset a
 * consumer's own internal component state (e.g. a form control) on
 * every open/close cycle and makes the content untestable with a plain
 * synchronous `detectChanges()`. Keeping it mounted trades a small
 * amount of always-present DOM for predictable state and testability.
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [IonModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-modal [isOpen]="isOpen()" [backdropDismiss]="dismissible()" [keepContentsMounted]="true" (didDismiss)="closed.emit()">
      <ng-template>
        <div class="app-modal" role="dialog" aria-modal="true" [attr.aria-label]="label() || null">
          <ng-content></ng-content>
        </div>
      </ng-template>
    </ion-modal>
  `,
  styleUrl: './modal.component.scss',
})
export class ModalComponent {
  readonly isOpen = input(false);
  /** Set `false` for a modal that must be explicitly dismissed via an in-content action (not by tapping the backdrop). */
  readonly dismissible = input(true);
  readonly label = input('');
  readonly closed = output<void>();
}
