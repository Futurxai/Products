import { Firestore } from 'firebase-admin/firestore';
import { ExperienceStorePort } from '../domain/ports/experience-store.port';
import { PuzzleExperience } from '../domain/models/puzzle-experience.model';
import { QuestionDefinition } from '../domain/models/question.model';

const EXPERIENCES = 'puzzle_experiences';
const EXPERIENCES_PRIVATE = 'puzzle_experiences_private';

/**
 * Firestore implementation of `ExperienceStorePort`. `markPublished`
 * is the one method with real concurrency exposure — two publish
 * attempts racing (a genuine possibility: a slow first request plus an
 * impatient double-click) must not both succeed, so it runs inside a
 * transaction that re-reads status and rejects if it isn't `'draft'`
 * anymore, rather than trusting the caller's earlier `canPublish`
 * check to still be true by the time this write happens.
 */
export function createExperienceStore(db: Firestore): ExperienceStorePort {
  return {
    async getExperience(experienceId: string): Promise<PuzzleExperience | null> {
      const publicRef = db.collection(EXPERIENCES).doc(experienceId);
      const privateRef = db.collection(EXPERIENCES_PRIVATE).doc(experienceId);
      const [publicSnap, privateSnap] = await Promise.all([publicRef.get(), privateRef.get()]);

      if (!publicSnap.exists) {
        return null;
      }

      const pub = publicSnap.data()!;
      const priv = privateSnap.exists ? privateSnap.data()! : {};

      return {
        experienceId,
        creatorId: pub['creatorId'],
        shareTokenHash: priv['shareTokenHash'] ?? null,
        occasion: pub['occasion'],
        emotion: pub['emotion'],
        recipientDisplayName: pub['recipientDisplayName'],
        status: pub['status'],
        welcomeNote: pub['welcomeNote'] ?? '',
        completionMessage: priv['completionMessage'] ?? '',
        partnerHelpChallenge: priv['partnerHelpChallenge'] ?? '',
        lockedPatternImagePath: pub['lockedPatternImagePath'] ?? '',
        revealImagePath: priv['revealImagePath'] ?? null,
        questions: (priv['questions'] ?? []) as readonly QuestionDefinition[],
        createdAt: toDate(pub['createdAt']),
        publishedAt: toDateOrNull(pub['publishedAt']),
        completedAt: toDateOrNull(pub['completedAt']),
        archivedAt: toDateOrNull(pub['archivedAt']),
      };
    },

    async markPublished({ experienceId, shareTokenHash, publishedAt }): Promise<void> {
      const publicRef = db.collection(EXPERIENCES).doc(experienceId);
      const privateRef = db.collection(EXPERIENCES_PRIVATE).doc(experienceId);

      await db.runTransaction(async (tx) => {
        const publicSnap = await tx.get(publicRef);
        if (!publicSnap.exists) {
          throw new Error(`Cannot publish: experience ${experienceId} does not exist.`);
        }
        const status = publicSnap.data()!['status'];
        if (status !== 'draft') {
          throw new Error(
            `Cannot publish experience ${experienceId}: current status is '${status}', expected 'draft' (likely a concurrent publish request).`,
          );
        }

        tx.update(publicRef, { status: 'published', publishedAt });
        tx.set(privateRef, { shareTokenHash }, { merge: true });
      });
    },

    async findExperienceIdByShareTokenHash(shareTokenHash: string): Promise<string | null> {
      // Runs via the Admin SDK, which bypasses Firestore rules entirely —
      // the rule denying client reads of puzzle_experiences_private does
      // not apply here. This is the one legitimate server-side lookup
      // across all private docs by token hash.
      const snap = await db
        .collection(EXPERIENCES_PRIVATE)
        .where('shareTokenHash', '==', shareTokenHash)
        .limit(1)
        .get();

      return snap.empty ? null : snap.docs[0].id;
    },
  };
}

function toDate(value: unknown): Date {
  return value && typeof (value as { toDate?: () => Date }).toDate === 'function'
    ? (value as { toDate: () => Date }).toDate()
    : new Date(value as string);
}

function toDateOrNull(value: unknown): Date | null {
  return value ? toDate(value) : null;
}
