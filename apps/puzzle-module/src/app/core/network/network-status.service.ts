import { Injectable, signal } from '@angular/core';

/**
 * Wraps the browser's own `navigator.onLine` + `online`/`offline` events
 * as a signal — the one place in the app allowed to touch these APIs
 * directly, per `core/README.md`'s "cross-cutting concern that doesn't
 * belong to any one feature." `providedIn: 'root'` means this lives for
 * the app's whole lifetime, so the event listeners are never removed —
 * there is no point at which "stop knowing whether the browser is
 * online" is a meaningful thing for this app to do.
 *
 * Deliberately advisory, not a gate: nothing in the app blocks an action
 * because `isOnline()` is false (a flaky `navigator.onLine` false
 * positive/negative is common, especially on mobile) — every real
 * network call already has its own try/catch and user-facing error
 * message (M4/M5). This is purely so the UI can proactively tell a
 * Recipient/Creator "you're offline" instead of waiting for their next
 * action to fail before saying anything (M5 Phase 5, error recovery).
 */
@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  private readonly _isOnline = signal(navigator.onLine);
  readonly isOnline = this._isOnline.asReadonly();

  constructor() {
    window.addEventListener('online', () => this._isOnline.set(true));
    window.addEventListener('offline', () => this._isOnline.set(false));
  }
}
