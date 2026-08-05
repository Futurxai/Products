import { Injectable, inject } from '@angular/core';
import { Storage, getBlob, ref, uploadBytes } from '@angular/fire/storage';

import { StorageUploadPort } from '@domain/ports/storage-upload.port';
import { validateImageFile } from '@domain/rules/wizard-progress.rules';

const MIME_TO_EXTENSION: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** `StorageUploadPort` implemented against `@angular/fire/storage`. */
@Injectable({ providedIn: 'root' })
export class FirebaseStorageUploadService implements StorageUploadPort {
  private readonly storage = inject(Storage);

  // Held as an overridable instance property (path in, Blob out) rather
  // than calling `ref`/`getBlob` inline — `@angular/fire/storage`'s
  // named exports are frozen ESM bindings, so `spyOn` can't intercept
  // them, and `ref()` itself requires a real AngularFire-wired
  // `Storage` instance to run. Tests replace this one property with a
  // fake instead of standing up the whole SDK.
  private fetchBlob = (path: string): Promise<Blob> => getBlob(ref(this.storage, path));

  async uploadRevealImage(creatorId: string, experienceId: string, file: File): Promise<void> {
    const validation = validateImageFile({ sizeBytes: file.size, mimeType: file.type });
    if (!validation.ok) {
      throw new Error(`Cannot upload reveal image: ${validation.error}`);
    }

    const extension = MIME_TO_EXTENSION[file.type];
    const path = `puzzle_storage/${creatorId}/${experienceId}/reveal-image-original.${extension}`;
    await uploadBytes(ref(this.storage, path), file, { contentType: file.type });
  }

  async getRevealImageOriginalBlob(creatorId: string, experienceId: string): Promise<Blob | null> {
    // The extension actually on disk depends on what MIME type was
    // uploaded (see `uploadRevealImage` above); nothing records that
    // choice anywhere readable back, so this tries every accepted
    // extension in turn rather than guessing one.
    for (const extension of Object.values(MIME_TO_EXTENSION)) {
      const path = `puzzle_storage/${creatorId}/${experienceId}/reveal-image-original.${extension}`;
      try {
        return await this.fetchBlob(path);
      } catch (error) {
        if (isObjectNotFoundError(error)) {
          continue;
        }
        throw error;
      }
    }
    return null;
  }
}

function isObjectNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'storage/object-not-found';
}
