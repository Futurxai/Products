import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NetworkStatusService } from '@core/network/network-status.service';

/**
 * Mounted exactly once, in `AppComponent`'s template, next to
 * `app-toast-host` — every page (Creator and Recipient) gets this for
 * free. Purely informational (M5 Phase 5, error recovery): being
 * offline never blocks anything here, it just tells the user proactively
 * instead of making them find out via a failed action first.
 * `aria-live="polite"` + `role="status"`, not `alert` — going offline
 * isn't an error to interrupt a screen reader for, and the message
 * persists on screen for as long as it's true, unlike a toast.
 */
@Component({
  selector: 'app-offline-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!networkStatus.isOnline()) {
      <div class="app-offline-banner" role="status" aria-live="polite">You're offline — some actions won't work until you're back online.</div>
    }
  `,
  styleUrl: './offline-banner.component.scss',
})
export class OfflineBannerComponent {
  protected readonly networkStatus = inject(NetworkStatusService);
}
