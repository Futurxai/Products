/**
 * How the Wizard uploads a Creator's chosen reveal-image file.
 * Implemented by `infrastructure/firebase/storage-upload.service.ts`
 * (M3) against `@angular/fire/storage`.
 *
 * `File` is a standard Web Platform type (not Firebase/Angular), so
 * using it in a port signature doesn't violate the "domain/ never
 * imports firebase/@angular/fire" boundary — only the infrastructure/
 * implementation ever touches the Storage SDK itself.
 */
export interface StorageUploadPort {
  /**
   * Uploads `file` as `puzzle_storage/{creatorId}/{experienceId}/reveal-image-original.{ext}`
   * — the exact path/filename `lovedigitally-web/storage.rules` and the
   * `onRevealImageUploaded` trigger (M2) both expect. Resolves once the
   * upload itself completes; does NOT wait for the trigger's
   * server-side slicing to finish (see `wizard-progress.rules.ts`'s
   * `isImageStepComplete` doc comment for why those are tracked
   * separately).
   */
  uploadRevealImage(creatorId: string, experienceId: string, file: File): Promise<void>;
}
