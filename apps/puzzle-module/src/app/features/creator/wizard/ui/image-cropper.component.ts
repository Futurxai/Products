import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  computed,
  output,
  signal,
} from '@angular/core';

import { ButtonComponent } from '@shared/button/button.component';

import { CropTransform, clamp, clampOffset, clampTransform, computeSourceRect, minCoverScale } from './crop-math';

const EXPORT_SIZE = 1200; // matches the server trigger's MAX_EDGE_PX cap — no point uploading more than it will ever keep
const ZOOM_STEP_FACTOR = 1.1;
const PAN_STEP_PX = 15;
const MAX_ZOOM_MULTIPLIER = 4;

/**
 * A square pan/zoom cropper — not a general arbitrary-rectangle crop
 * tool. The server always center-crops the upload to a square anyway
 * (`onRevealImageUploaded`, M2); this lets the Creator choose *which*
 * square instead of trusting an automatic center-crop that might cut
 * off a face. Deliberately does not implement pinch-to-zoom gesture
 * recognition (a substantial feature on its own) — drag-to-pan works
 * for mouse and single-touch alike via unified Pointer Events, and
 * zoom is covered by a slider plus +/- buttons, all keyboard-operable
 * too (arrow keys pan, +/- zoom) for WCAG 2.1 AA.
 */
@Component({
  selector: 'app-image-cropper',
  standalone: true,
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-cropper.component.html',
  styleUrl: './image-cropper.component.scss',
})
export class ImageCropperComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) file!: File;

  readonly cropped = output<Blob>();
  readonly cancelled = output<void>();

  @ViewChild('viewport', { static: true }) private viewportRef!: ElementRef<HTMLDivElement>;

  protected readonly imageUrl = signal<string | null>(null);
  protected readonly naturalWidth = signal(0);
  protected readonly naturalHeight = signal(0);
  protected readonly transform = signal<CropTransform>({ offsetX: 0, offsetY: 0, scale: 1 });
  protected readonly minScale = signal(1);
  protected readonly maxScale = computed(() => this.minScale() * MAX_ZOOM_MULTIPLIER);
  protected readonly exporting = signal(false);

  private objectUrl: string | null = null;
  private dragStart: { pointerX: number; pointerY: number; offsetX: number; offsetY: number } | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['file']) {
      this.loadImage(this.file);
    }
  }

  ngOnDestroy(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }
  }

  protected onPointerDown(event: PointerEvent): void {
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    const current = this.transform();
    this.dragStart = { pointerX: event.clientX, pointerY: event.clientY, offsetX: current.offsetX, offsetY: current.offsetY };
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.dragStart) {
      return;
    }
    const dx = event.clientX - this.dragStart.pointerX;
    const dy = event.clientY - this.dragStart.pointerY;
    this.applyOffset(this.dragStart.offsetX + dx, this.dragStart.offsetY + dy);
  }

  protected onPointerUp(): void {
    this.dragStart = null;
  }

  protected onZoomInput(rawValue: string): void {
    this.setScale(Number(rawValue));
  }

  protected zoomIn(): void {
    this.setScale(this.transform().scale * ZOOM_STEP_FACTOR);
  }

  protected zoomOut(): void {
    this.setScale(this.transform().scale / ZOOM_STEP_FACTOR);
  }

  protected onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowLeft':
        this.applyOffset(this.transform().offsetX + PAN_STEP_PX, this.transform().offsetY);
        break;
      case 'ArrowRight':
        this.applyOffset(this.transform().offsetX - PAN_STEP_PX, this.transform().offsetY);
        break;
      case 'ArrowUp':
        this.applyOffset(this.transform().offsetX, this.transform().offsetY + PAN_STEP_PX);
        break;
      case 'ArrowDown':
        this.applyOffset(this.transform().offsetX, this.transform().offsetY - PAN_STEP_PX);
        break;
      case '+':
      case '=':
        this.zoomIn();
        break;
      case '-':
      case '_':
        this.zoomOut();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  protected async confirmCrop(): Promise<void> {
    const url = this.imageUrl();
    if (!url) {
      return;
    }
    this.exporting.set(true);
    try {
      const rect = computeSourceRect(this.transform(), this.viewportSize());
      const image = new Image();
      image.src = url;
      await image.decode();

      const canvas = document.createElement('canvas');
      canvas.width = EXPORT_SIZE;
      canvas.height = EXPORT_SIZE;
      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }
      context.drawImage(image, rect.x, rect.y, rect.size, rect.size, 0, 0, EXPORT_SIZE, EXPORT_SIZE);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (blob) {
        this.cropped.emit(blob);
      }
    } finally {
      this.exporting.set(false);
    }
  }

  private loadImage(file: File): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }
    const url = URL.createObjectURL(file);
    this.objectUrl = url;

    const image = new Image();
    image.onload = () => {
      this.naturalWidth.set(image.naturalWidth);
      this.naturalHeight.set(image.naturalHeight);
      const scale = minCoverScale(image.naturalWidth, image.naturalHeight, this.viewportSize());
      this.minScale.set(scale);
      this.transform.set({ offsetX: 0, offsetY: 0, scale });
      this.imageUrl.set(url);
    };
    image.src = url;
  }

  private setScale(nextScale: number): void {
    const clampedScale = clamp(nextScale, this.minScale(), this.maxScale());
    const next = clampTransform(
      { ...this.transform(), scale: clampedScale },
      this.naturalWidth(),
      this.naturalHeight(),
      this.viewportSize(),
    );
    this.transform.set(next);
  }

  private applyOffset(offsetX: number, offsetY: number): void {
    const current = this.transform();
    const viewportSize = this.viewportSize();
    const renderedWidth = this.naturalWidth() * current.scale;
    const renderedHeight = this.naturalHeight() * current.scale;
    this.transform.set({
      scale: current.scale,
      offsetX: clampOffset(offsetX, renderedWidth, viewportSize),
      offsetY: clampOffset(offsetY, renderedHeight, viewportSize),
    });
  }

  private viewportSize(): number {
    return this.viewportRef.nativeElement.clientWidth;
  }
}
