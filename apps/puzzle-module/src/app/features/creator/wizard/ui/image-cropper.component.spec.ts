import { ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageCropperComponent } from './image-cropper.component';

// A minimal valid 1x1 transparent PNG — real enough for the browser's
// <img> decoder to actually fire `onload` with genuine natural dimensions,
// without shipping a real photo fixture into the repo.
const ONE_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function onePixelPngFile(): File {
  const binary = atob(ONE_PIXEL_PNG_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], 'photo.png', { type: 'image/png' });
}

describe('ImageCropperComponent', () => {
  let fixture: ComponentFixture<ImageCropperComponent>;
  let component: ImageCropperComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ImageCropperComponent] });
    fixture = TestBed.createComponent(ImageCropperComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('file', onePixelPngFile());
    fixture.detectChanges();
  });

  it('loads the image and detects its natural dimensions', (done) => {
    setTimeout(() => {
      expect(component['naturalWidth']()).toBe(1);
      expect(component['naturalHeight']()).toBe(1);
      expect(component['imageUrl']()).not.toBeNull();
      done();
    }, 50);
  });

  it('emits cancelled when "choose a different photo" is clicked', () => {
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));

    const buttons: HTMLElement[] = fixture.nativeElement.querySelectorAll('app-button');
    (buttons[0] as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(cancelled).toBeTrue();
  });

  describe('pan/zoom clamping (deterministic viewport)', () => {
    beforeEach(() => {
      // A controlled 280px viewport, independent of whatever the test DOM actually renders.
      component['viewportRef'] = { nativeElement: { clientWidth: 280 } } as ElementRef<HTMLDivElement>;
      component['naturalWidth'].set(1000);
      component['naturalHeight'].set(1000);
      component['minScale'].set(0.28); // 280 / 1000
      component['transform'].set({ offsetX: 0, offsetY: 0, scale: 0.5 }); // renders at 500x500, 220px slack per axis
    });

    it('ArrowRight pans the image left (offsetX decreases), clamped to the available slack', () => {
      for (let i = 0; i < 20; i++) {
        component['onKeydown']({ key: 'ArrowRight', preventDefault: () => {} } as KeyboardEvent);
      }
      expect(component['transform']().offsetX).toBe(-220);
    });

    it('ArrowLeft pans the image right, clamped at 0', () => {
      component['transform'].set({ offsetX: -100, offsetY: 0, scale: 0.5 });
      for (let i = 0; i < 20; i++) {
        component['onKeydown']({ key: 'ArrowLeft', preventDefault: () => {} } as KeyboardEvent);
      }
      expect(component['transform']().offsetX).toBe(0);
    });

    it('zoomIn increases scale but never past maxScale (4x minScale)', () => {
      for (let i = 0; i < 50; i++) {
        component['zoomIn']();
      }
      expect(component['transform']().scale).toBeCloseTo(component['minScale']() * 4, 5);
    });

    it('zoomOut decreases scale but never below minScale', () => {
      for (let i = 0; i < 50; i++) {
        component['zoomOut']();
      }
      expect(component['transform']().scale).toBeCloseTo(component['minScale'](), 5);
    });

    it('re-clamps pan offsets after zooming out reduces the available slack', () => {
      component['transform'].set({ offsetX: -220, offsetY: -220, scale: 0.5 });
      component['onZoomInput']('0.28'); // zoom out to minScale -> renders at exactly 280x280, zero slack

      expect(component['transform']().offsetX).toBe(0);
      expect(component['transform']().offsetY).toBe(0);
    });
  });
});
