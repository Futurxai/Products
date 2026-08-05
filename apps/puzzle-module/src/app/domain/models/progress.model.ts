import { EarnedVia } from './question.model';

/** State of a single piece within a Recipient's in-progress session. */
export interface PieceProgress {
  readonly status: 'locked' | 'unlocked';
  readonly earnedVia: EarnedVia | null;
  readonly cluesUsed: number;
  readonly pointsAwarded: number;
}

/** The 9-piece starting state — every question locked, nothing earned yet. */
export function lockedPiece(): PieceProgress {
  return { status: 'locked', earnedVia: null, cluesUsed: 0, pointsAwarded: 0 };
}

/**
 * A Recipient's progress through one experience. Firestore document
 * shape: `puzzle_progress/{experienceId}` (Phase 5 §5–6). Note there is
 * no `not_started` status here by design — per the Module Contract, a
 * progress document does not exist at all until the first gameplay
 * action, so "not started" is represented by absence, not a value.
 */
export interface Progress {
  readonly experienceId: string;
  readonly status: 'in_progress' | 'completed';
  readonly pieces: Readonly<Record<string, PieceProgress>>;
  readonly startedAt: Date;
  readonly lastUpdatedAt: Date;
  readonly completedAt: Date | null;
}
