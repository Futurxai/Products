import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastMessage {
  readonly id: number;
  readonly text: string;
  readonly variant: ToastVariant;
}

/**
 * A minimal signal-based toast queue — no Angular CDK/overlay
 * dependency, just a list `ToastHostComponent` (mounted once in
 * `AppComponent`) renders and auto-dismisses. Any page/facade can call
 * this without knowing where or how toasts are actually shown.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<readonly ToastMessage[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private nextId = 0;

  show(text: string, variant: ToastVariant = 'info', durationMs = 4000): void {
    const id = this.nextId++;
    this._toasts.update((toasts) => [...toasts, { id, text, variant }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  success(text: string, durationMs?: number): void {
    this.show(text, 'success', durationMs);
  }

  error(text: string, durationMs?: number): void {
    this.show(text, 'error', durationMs);
  }

  dismiss(id: number): void {
    this._toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }
}
