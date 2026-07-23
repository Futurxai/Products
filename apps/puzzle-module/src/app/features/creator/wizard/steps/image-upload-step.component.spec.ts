import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { PuzzleWizardFacade } from '@application/creator/puzzle-wizard.facade';
import { PuzzleExperience, draftExperience } from '@domain/models/puzzle-experience.model';
import { ToastService } from '@shared/toast/toast.service';

import { ImageUploadStepComponent } from './image-upload-step.component';

function fileOfSize(name: string, sizeBytes: number, type: string): File {
  const file = new File([new Uint8Array(1)], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

describe('ImageUploadStepComponent', () => {
  let fixture: ComponentFixture<ImageUploadStepComponent>;
  let component: ImageUploadStepComponent;
  let draft: ReturnType<typeof signal<PuzzleExperience | null>>;
  let imageUploading: ReturnType<typeof signal<boolean>>;
  let uploadImage: jasmine.Spy;
  let toast: ToastService;

  beforeEach(() => {
    draft = signal<PuzzleExperience | null>(
      draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: 'Ananya' }),
    );
    imageUploading = signal(false);
    uploadImage = jasmine.createSpy('uploadImage').and.resolveTo(true);

    TestBed.configureTestingModule({
      imports: [ImageUploadStepComponent],
      providers: [{ provide: PuzzleWizardFacade, useValue: { draft, imageUploading, uploadImage } }],
    });

    fixture = TestBed.createComponent(ImageUploadStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
  });

  function selectFile(file: File): void {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    Object.defineProperty(input, 'files', { value: dataTransfer.files, configurable: true });
    input.dispatchEvent(new Event('change'));
  }

  it('shows a picker button with no file selected yet', () => {
    fixture.detectChanges();
    expect(component['selectedFile']()).toBeNull();
    expect(fixture.nativeElement.querySelector('app-image-cropper')).toBeNull();
  });

  it('rejects an oversized file with a friendly message and does not open the cropper', () => {
    selectFile(fileOfSize('photo.jpg', 11 * 1024 * 1024, 'image/jpeg'));
    fixture.detectChanges();

    expect(component['selectedFile']()).toBeNull();
    expect(component['validationError']()).toContain('too large');
  });

  it('rejects an unsupported file type', () => {
    selectFile(fileOfSize('doc.pdf', 1024, 'application/pdf'));
    fixture.detectChanges();

    expect(component['validationError']()).toContain('JPEG, PNG, or WebP');
  });

  it('accepts a valid file and opens the cropper', () => {
    selectFile(fileOfSize('photo.jpg', 1024, 'image/jpeg'));
    fixture.detectChanges();

    expect(component['selectedFile']()).not.toBeNull();
    expect(component['validationError']()).toBeNull();
    expect(fixture.nativeElement.querySelector('app-image-cropper')).not.toBeNull();
  });

  it('onCropCancelled returns to the picker state', () => {
    selectFile(fileOfSize('photo.jpg', 1024, 'image/jpeg'));
    component['onCropCancelled']();
    expect(component['selectedFile']()).toBeNull();
  });

  it('onCropped uploads the cropped blob as a jpeg File scoped to the draft, and shows a preview on success', async () => {
    const blob = new Blob([new Uint8Array(1)], { type: 'image/jpeg' });

    await component['onCropped'](blob);

    expect(uploadImage).toHaveBeenCalled();
    const uploadedFile = uploadImage.calls.mostRecent().args[0] as File;
    expect(uploadedFile.type).toBe('image/jpeg');
    expect(component['selectedFile']()).toBeNull();
    expect(component['previewUrl']()).not.toBeNull();
    expect(toast.success).toHaveBeenCalledWith('Photo uploaded!');
  });

  it('does not show a preview when the upload fails', async () => {
    uploadImage.and.resolveTo(false);
    const blob = new Blob([new Uint8Array(1)], { type: 'image/jpeg' });

    await component['onCropped'](blob);

    expect(component['previewUrl']()).toBeNull();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows the confirmed state once revealImagePath is already set on resume, even with no local preview', () => {
    draft.set({ ...draft()!, revealImagePath: 'puzzle_storage/cre_001/exp_1/reveal-image.jpg' });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Photo uploaded');
  });
});
