import { Creator } from '../models/creator.model';

/**
 * How the application layer reads and writes Creator profile documents
 * (`puzzle_creators/{creatorId}`), without knowing Firestore is on the
 * other end. Implemented by
 * `infrastructure/firebase/firestore-creator.repository.ts` (M3).
 *
 * Separate from `AuthPort` on purpose — see that port's doc comment.
 */
export interface CreatorRepositoryPort {
  getById(creatorId: string): Promise<Creator | null>;

  /** Called once, immediately after a successful sign-up or a first-time Google sign-in. */
  create(creator: Creator): Promise<void>;

  update(creatorId: string, changes: Partial<Creator>): Promise<void>;
}
