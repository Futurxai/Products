import { TestBed } from '@angular/core/testing';
import { Storage } from '@angular/fire/storage';

import { FirebaseStorageUploadService } from './storage-upload.service';

describe('FirebaseStorageUploadService', () => {
  let service: FirebaseStorageUploadService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: Storage, useValue: {} }],
    });
    service = TestBed.inject(FirebaseStorageUploadService);
  });

  it('rejects an oversized file before ever touching Storage', async () => {
    const oversized = new File([new Uint8Array(1)], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(oversized, 'size', { value: 10 * 1024 * 1024 });

    await expectAsync(service.uploadRevealImage('cre_001', 'exp_1', oversized)).toBeRejectedWithError(
      /too_large/,
    );
  });

  it('rejects an unsupported file type before ever touching Storage', async () => {
    const wrongType = new File([new Uint8Array(1)], 'doc.pdf', { type: 'application/pdf' });

    await expectAsync(service.uploadRevealImage('cre_001', 'exp_1', wrongType)).toBeRejectedWithError(
      /unsupported_type/,
    );
  });
});
