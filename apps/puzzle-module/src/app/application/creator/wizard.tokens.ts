import { InjectionToken } from '@angular/core';
import { StorageUploadPort } from '@domain/ports/storage-upload.port';

/** See `auth.tokens.ts` for why an `InjectionToken` is needed at all — same reasoning applies here. */
export const STORAGE_UPLOAD_PORT = new InjectionToken<StorageUploadPort>('STORAGE_UPLOAD_PORT');
