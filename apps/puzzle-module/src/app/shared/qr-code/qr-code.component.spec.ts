import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { QrCodeComponent } from './qr-code.component';

describe('QrCodeComponent', () => {
  let fixture: ComponentFixture<QrCodeComponent>;
  let component: QrCodeComponent;

  function stubGenerate(fn: jasmine.Spy): void {
    (component as unknown as { generateDataUrl: jasmine.Spy }).generateDataUrl = fn;
  }

  // Stubbing must happen before `setInput()` — an input signal's value
  // change can synchronously trigger any effect that reads it, so
  // setting `data` before the stub is in place risks the effect's
  // first run calling the real `qrcode` library instead.
  function setInputs(data: string, size: number): void {
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('size', size);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [QrCodeComponent] });
    fixture = TestBed.createComponent(QrCodeComponent);
    component = fixture.componentInstance;
  });

  it(
    'renders an <img> with the generated data URI once QR generation resolves',
    fakeAsync(() => {
      stubGenerate(jasmine.createSpy('generateDataUrl').and.resolveTo('data:image/png;base64,fakeqrdata'));
      setInputs('https://puzzle.lovedigitally.app/e/pzl_abc123', 200);

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const img: HTMLImageElement = fixture.nativeElement.querySelector('.app-qr-code');
      expect(img.src).toContain('data:image/png;base64,fakeqrdata');
      expect(img.getAttribute('width')).toBe('200');
    }),
  );

  it(
    'passes the bound data string and size to the generator',
    fakeAsync(() => {
      const spy = jasmine.createSpy('generateDataUrl').and.resolveTo('data:image/png;base64,fakeqrdata');
      stubGenerate(spy);
      setInputs('https://puzzle.lovedigitally.app/e/pzl_abc123', 200);

      fixture.detectChanges();
      tick();

      expect(spy).toHaveBeenCalledWith('https://puzzle.lovedigitally.app/e/pzl_abc123', jasmine.objectContaining({ width: 200 }));
    }),
  );

  it(
    'shows an error message if QR generation fails',
    fakeAsync(() => {
      stubGenerate(jasmine.createSpy('generateDataUrl').and.rejectWith(new Error('boom')));
      setInputs('https://puzzle.lovedigitally.app/e/pzl_abc123', 200);

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.app-qr-code')).toBeNull();
      expect(fixture.nativeElement.querySelector('.app-qr-code__error')).not.toBeNull();
    }),
  );
});
