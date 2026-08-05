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

  describe('getRevealImageOriginalBlob', () => {
    function notFoundError(): Error {
      return Object.assign(new Error('storage/object-not-found'), { code: 'storage/object-not-found' });
    }

    // `@angular/fire/storage`'s `getBlob` is a frozen ESM export —
    // `spyOn` can't intercept it — so these tests replace the
    // service's own `fetchBlob` instance property instead (see that
    // property's doc comment).
    function stubFetchBlob(fn: jasmine.Spy): void {
      (service as unknown as { fetchBlob: jasmine.Spy }).fetchBlob = fn;
    }

    it('returns the blob once the jpg extension resolves', async () => {
      const blob = new Blob(['fake image bytes']);
      const fetchBlobSpy = jasmine.createSpy('fetchBlob').and.resolveTo(blob);
      stubFetchBlob(fetchBlobSpy);

      const result = await service.getRevealImageOriginalBlob('cre_001', 'exp_1');

      expect(result).toBe(blob);
      expect(fetchBlobSpy).toHaveBeenCalledTimes(1);
    });

    it('falls through to the next accepted extension when one is not found', async () => {
      const blob = new Blob(['fake image bytes']);
      let callCount = 0;
      const fetchBlobSpy = jasmine.createSpy('fetchBlob').and.callFake(() => {
        callCount += 1;
        return callCount === 1 ? Promise.reject(notFoundError()) : Promise.resolve(blob);
      });
      stubFetchBlob(fetchBlobSpy);

      const result = await service.getRevealImageOriginalBlob('cre_001', 'exp_1');

      expect(result).toBe(blob);
      expect(fetchBlobSpy).toHaveBeenCalledTimes(2);
    });

    it('resolves null when no extension has ever been uploaded', async () => {
      stubFetchBlob(jasmine.createSpy('fetchBlob').and.rejectWith(notFoundError()));

      const result = await service.getRevealImageOriginalBlob('cre_001', 'exp_1');

      expect(result).toBeNull();
    });

    it('rethrows a non-"not-found" error instead of swallowing it', async () => {
      stubFetchBlob(jasmine.createSpy('fetchBlob').and.rejectWith(new Error('network down')));

      await expectAsync(service.getRevealImageOriginalBlob('cre_001', 'exp_1')).toBeRejectedWithError('network down');
    });
  });
});
