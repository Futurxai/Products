import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';
import { QUESTION_IDS } from '../domain/models/constants';
import { createLogger } from '../config/logger';
import { DEFAULT_STORAGE_BUCKET } from '../config/app-config';

/**
 * Fires on every write to the bucket (Storage triggers aren't
 * path-filterable at the platform level), so the first thing this does
 * is ignore anything that isn't a creator's original upload.
 */
const ORIGINAL_UPLOAD_PATTERN = /^puzzle_storage\/([^/]+)\/([^/]+)\/reveal-image-original\.(jpg|jpeg|png|webp)$/i;

const GRID_SIZE = 3; // matches QUESTIONS_PER_EXPERIENCE = 9 = 3x3, PRD §12
const MAX_EDGE_PX = 1200; // resolution cap — a phone-camera original doesn't need to stay full-size
const JPEG_QUALITY = 85;

/**
 * Slices a creator's uploaded reveal image into the 9 pieces the
 * Puzzle Board reveals progressively. This is what makes the security
 * boundary in Module Contract §8 real: the client is never able to
 * fetch a piece it hasn't earned, because that piece's *file* doesn't
 * exist in a client-readable location — `submitAnswer` /
 * `requestPartnerHelpReveal` only mint a signed URL for one slice at a
 * time, after confirming it was actually earned.
 *
 * `canPublish` (domain/rules/lifecycle.rules.ts) requires
 * `revealImagePath` to be set — which only happens here, once slicing
 * completes — so publishing is naturally blocked until this trigger
 * has finished, without the two being explicitly coupled anywhere.
 *
 * questionId <-> grid position is row-major: q1 top-left, q2 top-mid,
 * q3 top-right, q4 mid-left, ... q9 bottom-right.
 *
 * `bucket` is pinned explicitly (`DEFAULT_STORAGE_BUCKET`) rather than
 * left for the SDK to infer from ambient env vars — that inference
 * only works inside a real Cloud Functions runtime or the emulator,
 * and throwing at module-load time otherwise would make anything that
 * imports this file, even indirectly via index.ts, impossible to
 * import from a plain unit-test process.
 */
export const onRevealImageUploaded = onObjectFinalized(
  { region: 'asia-south1', memory: '512MiB', bucket: DEFAULT_STORAGE_BUCKET },
  async (event) => {
    const filePath = event.data.name;
    const match = filePath.match(ORIGINAL_UPLOAD_PATTERN);
    if (!match) {
      return; // Not a reveal-image-original upload — nothing to do.
    }

    const [, creatorId, experienceId] = match;
    const logger = createLogger({ functionName: 'onRevealImageUploaded', experienceId });

    const bucket = getStorage().bucket(event.data.bucket);
    const [originalBuffer] = await bucket.file(filePath).download();

    const oriented = sharp(originalBuffer).rotate(); // normalize EXIF orientation before measuring
    const metadata = await oriented.metadata();
    const shortEdge = Math.min(metadata.width ?? 0, metadata.height ?? 0);

    if (shortEdge === 0) {
      logger.error('Uploaded file has no readable image dimensions — skipping', { filePath });
      return;
    }

    const targetSize = Math.min(shortEdge, MAX_EDGE_PX);
    const squareBuffer = await oriented
      .extract({
        left: Math.floor(((metadata.width ?? shortEdge) - shortEdge) / 2),
        top: Math.floor(((metadata.height ?? shortEdge) - shortEdge) / 2),
        width: shortEdge,
        height: shortEdge,
      })
      .resize(targetSize, targetSize)
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    const basePath = `puzzle_storage/${creatorId}/${experienceId}`;

    await bucket.file(`${basePath}/reveal-image.jpg`).save(squareBuffer, {
      contentType: 'image/jpeg',
      metadata: { cacheControl: 'private, max-age=0, no-store' },
    });

    const pieceSize = Math.floor(targetSize / GRID_SIZE);
    await Promise.all(
      QUESTION_IDS.map(async (questionId, index) => {
        const row = Math.floor(index / GRID_SIZE);
        const col = index % GRID_SIZE;
        const pieceBuffer = await sharp(squareBuffer)
          .extract({ left: col * pieceSize, top: row * pieceSize, width: pieceSize, height: pieceSize })
          .jpeg({ quality: JPEG_QUALITY })
          .toBuffer();

        await bucket.file(`${basePath}/reveal-image-slice-${questionId}.jpg`).save(pieceBuffer, {
          contentType: 'image/jpeg',
          metadata: { cacheControl: 'private, max-age=0, no-store' },
        });
      }),
    );

    await getFirestore()
      .collection('puzzle_experiences_private')
      .doc(experienceId)
      .set({ revealImagePath: `${basePath}/reveal-image.jpg` }, { merge: true });

    logger.info('Reveal image sliced into 9 pieces', { experienceId, targetSize, pieceSize });
  },
);
