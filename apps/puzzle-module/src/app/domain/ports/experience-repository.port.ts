import { PuzzleExperience } from '../models/puzzle-experience.model';

/**
 * How the Creator-facing application layer reads and writes puzzle
 * experiences, without knowing that "Firestore" is the thing on the
 * other end. Implemented by
 * `infrastructure/firebase/firestore-experience.repository.ts` in M2.
 *
 * Deliberately does NOT expose a `delete` — the PRD has no delete
 * business rule, only `archive` (a status transition via `update`), so
 * this interface doesn't offer a capability the product doesn't have.
 */
export interface ExperienceRepositoryPort {
  getById(experienceId: string): Promise<PuzzleExperience | null>;

  /** Dashboard listing — ordered newest first, per the `puzzle_experiences` composite index (Phase 5 §5–6). */
  listByCreator(creatorId: string): Promise<readonly PuzzleExperience[]>;

  create(experience: PuzzleExperience): Promise<void>;

  /** Partial update — e.g. a single wizard step's autosave, or a status transition. */
  update(experienceId: string, changes: Partial<PuzzleExperience>): Promise<void>;
}
