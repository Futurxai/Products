import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService } from './toast.service';

/**
 * Mounted exactly once, in `AppComponent`'s template — every page just
 * calls `ToastService.show()`/`success()`/`error()` and this renders
 * whatever is currently queued. Error toasts get `role="alert"` +
 * `aria-live="assertive"`; success/info get the gentler `status`/`polite`
 * pairing, so a screen reader doesn't interrupt for routine confirmations.
 */
@Component({
  selector: 'app-toast-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-toast-host">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="app-toast"
          [class.app-toast--success]="toast.variant === 'success'"
          [class.app-toast--error]="toast.variant === 'error'"
          [class.app-toast--info]="toast.variant === 'info'"
          [attr.role]="toast.variant === 'error' ? 'alert' : 'status'"
          [attr.aria-live]="toast.variant === 'error' ? 'assertive' : 'polite'"
        >
          <span class="app-toast__text">{{ toast.text }}</span>
          <button type="button" class="app-toast__dismiss" aria-label="Dismiss notification" (click)="toastService.dismiss(toast.id)">
            &times;
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './toast-host.component.scss',
})
export class ToastHostComponent {
  protected readonly toastService = inject(ToastService);
}
