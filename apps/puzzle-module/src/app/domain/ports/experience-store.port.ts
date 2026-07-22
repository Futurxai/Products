import { PuzzleExperience } from '../models/puzzle-experience.model';

/**
 * Server-side persistence contract for Cloud Functions (M2), distinct
 * from `ExperienceRepositoryPort` (the client-facing port for the
 * Angular app, M3). They're kept separate on purpose: the client reads
 * a document and does simple CRUD on its own draft; the server performs
 * atomic, business-meaningful transitions across BOTH the
 * `puzzle_experiences` (public) and `puzzle_experiences_private`
 * (sensitive) collections at once.
 *
 * Each method here names a business operation, not a storage
 * mechanism — `markPublished` doesn't mention "transaction" anywhere.
 * *How* atomicity is achieved (a Firestore transaction, specifically,
 * because publish must never leave the public/private collections in
 * an inconsistent split state) is entirely
 * `infrastructure/firestore-experience.store.ts`'s concern.
 */
export interface ExperienceStorePort {
  /** Full experience — public + private fields merged — or `null` if it doesn't exist. Used for authorization and `canPublish` checks. */
  getExperience(experienceId: string): Promise<PuzzleExperience | null>;

  /**
   * Atomically transitions draft → published: writes the share-token
   * hash to the private doc and flips status/publishedAt on the public
   * doc. Implementations must reject (not silently proceed) if the
   * experience is not currently in `draft` status.
   */
  markPublished(params: {
    experienceId: string;
    shareTokenHash: string;
    publishedAt: Date;
  }): Promise<void>;

  /** Resolves a token hash to its owning experience — the lookup `resolveShareToken` needs, without exposing how tokens are indexed. */
  findExperienceIdByShareTokenHash(shareTokenHash: string): Promise<string | null>;
}
