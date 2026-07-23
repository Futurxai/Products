import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytes } from '@angular/fire/storage';

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

  async uploadRevealImage(creatorId: string, experienceId: string, file: File): Promise<void> {
    const validation = validateImageFile({ sizeBytes: file.size, mimeType: file.type });
    if (!validation.ok) {
      throw new Error(`Cannot upload reveal image: ${validation.error}`);
    }

    const extension = MIME_TO_EXTENSION[file.type];
    const path = `puzzle_storage/${creatorId}/${experienceId}/reveal-image-original.${extension}`;
    await uploadBytes(ref(this.storage, path), file, { contentType: file.type });
  }
}
