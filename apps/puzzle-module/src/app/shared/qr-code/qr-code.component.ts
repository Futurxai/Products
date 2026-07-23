import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import * as QRCode from 'qrcode';

/**
 * Renders a QR code for `data` entirely client-side (the `qrcode`
 * npm package — canvas/data-URI generation, no network call). This
 * matters beyond bundle size: `data` is a puzzle's share link,
 * carrying its secure share token, so it must never be sent to a
 * third-party "QR image API" to be rendered — that would leak the
 * token to a service this app doesn't control, undermining the whole
 * point of a secure, unguessable token (Module Contract §8).
 */
@Component({
  selector: 'app-qr-code',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (dataUrl(); as url) {
      <img [src]="url" [attr.alt]="alt()" [attr.width]="size()" [attr.height]="size()" class="app-qr-code" />
    } @else if (error()) {
      <p class="app-qr-code__error" role="alert">Couldn't generate the QR code.</p>
    }
  `,
  styleUrl: './qr-code.component.scss',
})
export class QrCodeComponent {
  readonly data = input.required<string>();
  readonly alt = input('QR code');
  readonly size = input(200);

  protected readonly dataUrl = signal<string | null>(null);
  protected readonly error = signal(false);

  // Wrapped (not called as `QRCode.toDataURL` inline) so the property
  // has one clean, non-overloaded signature — `toDataURL` itself has
  // several overloads (callback-style vs Promise-style) that make
  // `spyOn` unreliable — and so tests can replace this one property
  // instead of the imported module (same pattern used for other
  // third-party/SDK calls in this codebase).
  private generateDataUrl = (text: string, options: QRCode.QRCodeToDataURLOptions): Promise<string> => QRCode.toDataURL(text, options);

  constructor() {
    effect(
      () => {
        const data = this.data();
        const size = this.size();
        void this.generate(data, size);
      },
      { allowSignalWrites: true },
    );
  }

  private async generate(data: string, size: number): Promise<void> {
    this.error.set(false);
    try {
      const url = await this.generateDataUrl(data, { width: size, margin: 1 });
      this.dataUrl.set(url);
    } catch {
      this.dataUrl.set(null);
      this.error.set(true);
    }
  }
}
