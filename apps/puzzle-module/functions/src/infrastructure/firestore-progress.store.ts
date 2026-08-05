import { FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore';
import { ProgressStorePort } from '../domain/ports/progress-store.port';
import { PieceProgress, lockedPiece, Progress } from '../domain/models/progress.model';
import { MAX_CLUES_PER_QUESTION, QUESTION_IDS } from '../domain/models/constants';
import { AlreadyUnlockedError, NoCluesRemainingError } from '../domain/errors/domain-errors';
import { isExperienceComplete } from '../domain/rules/lifecycle.rules';

const PROGRESS = 'puzzle_progress';

interface ProgressDoc {
  status: 'in_progress' | 'completed';
  pieces: Record<string, PieceProgress>;
  attempts: Record<string, number>;
  startedAt: Timestamp;
  lastUpdatedAt: Timestamp;
  completedAt: Timestamp | null;
}

/**
 * Firestore implementation of `ProgressStorePort`. Every mutating
 * method here runs inside `db.runTransaction`, per requirement #3 —
 * this is the one document a Recipient's client can hit concurrently
 * (double-tap, two tabs, a retried request after a flaky connection),
 * and Firestore transactions are what turn "read current state, decide,
 * write" into a single atomic step instead of three separate ones a
 * second request could interleave with.
 *
 * `FieldValue.serverTimestamp()` is a write-only sentinel — it isn't
 * resolved to a real value until after the transaction commits, so
 * methods that need to return the just-written state build the
 * client-facing `Progress` from an explicit `new Date()` taken at call
 * time instead of re-reading the document a second time.
 */
export function createProgressStore(db: Firestore): ProgressStorePort {
  const collection = db.collection(PROGRESS);

  return {
    async getProgress(experienceId: string): Promise<Progress | null> {
      const snap = await collection.doc(experienceId).get();
      return snap.exists ? toDomainProgress(experienceId, snap.data() as ProgressDoc) : null;
    },

    async initializeIfAbsent(experienceId: string): Promise<Progress> {
      const ref = collection.doc(experienceId);
      const callTime = new Date();

      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists) {
          return toDomainProgress(experienceId, snap.data() as ProgressDoc);
        }

        const pieces: Record<string, PieceProgress> = {};
        const attempts: Record<string, number> = {};
        for (const questionId of QUESTION_IDS) {
          pieces[questionId] = lockedPiece();
          attempts[questionId] = 0;
        }

        tx.set(ref, {
          status: 'in_progress',
          pieces,
          attempts,
          startedAt: FieldValue.serverTimestamp(),
          lastUpdatedAt: FieldValue.serverTimestamp(),
          completedAt: null,
        });

        return {
          experienceId,
          status: 'in_progress',
          pieces,
          startedAt: callTime,
          lastUpdatedAt: callTime,
          completedAt: null,
        };
      });
    },

    async recordAnswerAttempt(experienceId: string, questionId: string): Promise<number> {
      const ref = collection.doc(experienceId);

      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
          throw new Error(`Cannot record an attempt: no progress document for experience ${experienceId}.`);
        }
        const doc = snap.data() as ProgressDoc;
        const nextCount = (doc.attempts?.[questionId] ?? 0) + 1;

        tx.update(ref, {
          [`attempts.${questionId}`]: nextCount,
          lastUpdatedAt: FieldValue.serverTimestamp(),
        });

        return nextCount;
      });
    },

    async recordClueUsed(experienceId: string, questionId: string, availableClueCount: number): Promise<number> {
      const ref = collection.doc(experienceId);

      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
          throw new Error(`Cannot record a clue: no progress document for experience ${experienceId}.`);
        }
        const doc = snap.data() as ProgressDoc;
        const piece = doc.pieces[questionId];

        if (piece.status === 'unlocked') {
          throw new AlreadyUnlockedError(questionId);
        }
        if (piece.cluesUsed >= Math.min(availableClueCount, MAX_CLUES_PER_QUESTION)) {
          throw new NoCluesRemainingError(questionId);
        }

        const nextCluesUsed = piece.cluesUsed + 1;
        tx.update(ref, {
          [`pieces.${questionId}.cluesUsed`]: nextCluesUsed,
          lastUpdatedAt: FieldValue.serverTimestamp(),
        });

        return nextCluesUsed;
      });
    },

    async resolvePiece({ experienceId, questionId, earnedVia, cluesUsed, pointsAwarded }): Promise<Progress> {
      const ref = collection.doc(experienceId);
      const callTime = new Date();

      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) {
          throw new Error(`Cannot resolve a piece: no progress document for experience ${experienceId}.`);
        }
        const doc = snap.data() as ProgressDoc;
        const existingPiece = doc.pieces[questionId];

        if (existingPiece.status === 'unlocked') {
          throw new AlreadyUnlockedError(questionId);
        }

        const resolvedPiece: PieceProgress = { status: 'unlocked', earnedVia, cluesUsed, pointsAwarded };
        const updatedPieces: Record<string, PieceProgress> = { ...doc.pieces, [questionId]: resolvedPiece };
        const nowComplete = isExperienceComplete(updatedPieces);

        const updates: Record<string, unknown> = {
          [`pieces.${questionId}`]: resolvedPiece,
          lastUpdatedAt: FieldValue.serverTimestamp(),
        };
        if (nowComplete) {
          updates['status'] = 'completed';
          updates['completedAt'] = FieldValue.serverTimestamp();
        }
        tx.update(ref, updates as FirebaseFirestore.UpdateData<ProgressDoc>);

        return {
          experienceId,
          status: nowComplete ? 'completed' : doc.status,
          pieces: updatedPieces,
          startedAt: doc.startedAt.toDate(),
          lastUpdatedAt: callTime,
          completedAt: nowComplete ? callTime : doc.completedAt?.toDate() ?? null,
        };
      });
    },
  };
}

function toDomainProgress(experienceId: string, doc: ProgressDoc): Progress {
  return {
    experienceId,
    status: doc.status,
    pieces: doc.pieces,
    startedAt: doc.startedAt.toDate(),
    lastUpdatedAt: doc.lastUpdatedAt.toDate(),
    completedAt: doc.completedAt ? doc.completedAt.toDate() : null,
  };
}
