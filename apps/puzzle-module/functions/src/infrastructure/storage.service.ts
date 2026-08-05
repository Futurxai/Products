import { Bucket } from '@google-cloud/storage';

/**
 * Signed-URL minting for the reveal image and its 9 slices. This is
 * the only path by which a client ever sees pixel data from
 * `puzzle_storage/{creatorId}/{experienceId}/reveal-image*` — Storage
 * Rules deny direct client reads of those files entirely (see
 * `lovedigitally-web/storage.rules`), so a URL from here is the sole
 * way in, and it's only ever minted after a piece is confirmed earned.
 */
export interface StorageService {
  getPieceSignedUrl(creatorId: string, experienceId: string, questionId: string): Promise<string>;
  getFullRevealSignedUrl(creatorId: string, experienceId: string): Promise<string>;
  /** No signing needed — `puzzle_storage/_shared/patterns/**` is publicly readable by Storage Rules. */
  getPublicUrl(path: string): string;
}

const SIGNED_URL_TTL_MS = 15 * 60 * 1000; // 15 minutes — long enough to render, short enough to limit leakage if a URL is ever copied out

export function createStorageService(bucket: Bucket): StorageService {
  async function signedUrlFor(path: string): Promise<string> {
    const [url] = await bucket.file(path).getSignedUrl({
      action: 'read',
      expires: Date.now() + SIGNED_URL_TTL_MS,
    });
    return url;
  }

  return {
    getPieceSignedUrl(creatorId, experienceId, questionId) {
      return signedUrlFor(`puzzle_storage/${creatorId}/${experienceId}/reveal-image-slice-${questionId}.jpg`);
    },
    getFullRevealSignedUrl(creatorId, experienceId) {
      return signedUrlFor(`puzzle_storage/${creatorId}/${experienceId}/reveal-image.jpg`);
    },
    getPublicUrl(path) {
      return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media`;
    },
  };
}
