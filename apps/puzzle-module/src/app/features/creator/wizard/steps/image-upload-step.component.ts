import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';

import { PuzzleWizardFacade } from '@application/creator/puzzle-wizard.facade';
import { ACCEPTED_IMAGE_MIME_TYPES } from '@domain/models/constants';
import { validateImageFile } from '@domain/rules/wizard-progress.rules';
import { ButtonComponent } from '@shared/button/button.component';
import { ToastService } from '@shared/toast/toast.service';

import { ImageCropperComponent } from '../ui/image-cropper.component';

/**
 * Step 2 — pick, validate, crop, and upload the reveal photo.
 *
 * Preview is deliberately client-side-only: Storage Rules only ever
 * grant the creator read access to their own `reveal-image-original.*`
 * upload, never the server-generated `reveal-image.jpg` `revealImagePath`
 * points to (that stays Cloud-Function-only, same as the Recipient's
 * piece reveals). So the preview shown here is the just-cropped local
 * blob for this session; resuming a draft later shows a plain "Photo
 * uploaded" confirmation instead of re-fetching an image, since there's
 * nothing this component is allowed to fetch back.
 */
@Component({
  selector: 'app-image-upload-step',
  standalone: true,
  imports: [ButtonComponent, ImageCropperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-upload-step.component.html',
  styleUrl: './image-upload-step.component.scss',
})
export class ImageUploadStepComponent {
  protected readonly wizardFacade = inject(PuzzleWizardFacade);
  private readonly toast = inject(ToastService);

  @ViewChild('fileInput') private fileInputRef!: ElementRef<HTMLInputElement>;

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly validationError = signal<string | null>(null);
  protected readonly acceptedTypes = ACCEPTED_IMAGE_MIME_TYPES.join(',');

  protected triggerFilePicker(): void {
    this.fileInputRef.nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = ''; // lets the same file be picked again later (e.g. after cancelling)
    if (!file) {
      return;
    }

    const validation = validateImageFile({ sizeBytes: file.size, mimeType: file.type });
    if (!validation.ok) {
      this.validationError.set(
        validation.error === 'too_large' ? 'That photo is too large — please choose one under 10MB.' : 'Please choose a JPEG, PNG, or WebP photo.',
      );
      return;
    }
    this.validationError.set(null);
    this.selectedFile.set(file);
  }

  protected async onCropped(blob: Blob): Promise<void> {
    const file = new File([blob], 'reveal-image-original.jpg', { type: 'image/jpeg' });
    const success = await this.wizardFacade.uploadImage(file);
    this.selectedFile.set(null);
    if (success) {
      this.setPreview(blob);
      this.toast.success('Photo uploaded!');
    }
  }

  protected onCropCancelled(): void {
    this.selectedFile.set(null);
  }

  protected replacePhoto(): void {
    this.previewUrl.set(null);
    this.triggerFilePicker();
  }

  private setPreview(blob: Blob): void {
    const previous = this.previewUrl();
    if (previous) {
      URL.revokeObjectURL(previous);
    }
    this.previewUrl.set(URL.createObjectURL(blob));
  }
}
