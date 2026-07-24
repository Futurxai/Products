import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  Timestamp,
  UpdateData,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  writeBatch,
} from '@angular/fire/firestore';

import { ExperienceRepositoryPort } from '@domain/ports/experience-repository.port';
import { ExperienceStatus, PuzzleExperience } from '@domain/models/puzzle-experience.model';
import { QuestionDefinition } from '@domain/models/question.model';

const EXPERIENCES = 'puzzle_experiences';
const EXPERIENCES_PRIVATE = 'puzzle_experiences_private';

interface PublicDoc {
  creatorId: string;
  occasion: string;
  emotion: string;
  recipientDisplayName: string;
  status: ExperienceStatus;
  welcomeNote: string;
  lockedPatternImagePath: string;
  createdAt: Timestamp;
  publishedAt: Timestamp | null;
  completedAt: Timestamp | null;
  archivedAt: Timestamp | null;
}

interface PrivateDoc {
  shareTokenHash?: string | null;
  completionMessage: string;
  partnerHelpChallenge: string;
  revealImagePath: string | null;
  questions: readonly QuestionDefinition[];
}

/**
 * `ExperienceRepositoryPort` implemented against `@angular/fire/firestore`.
 * Every `PuzzleExperience` is split across two documents — mirroring
 * exactly what `functions/src/infrastructure/firestore-experience.store.ts`
 * (M2) reads/writes via the Admin SDK, since both sides of the app must
 * agree on one schema:
 *   - `puzzle_experiences/{id}` — public projection (safe to read by
 *     anyone; the Recipient's `resolveShareToken` response is built
 *     from this).
 *   - `puzzle_experiences_private/{id}` — owner-only (questions with
 *     `correctAnswer`/`clues`, `revealImagePath`, `shareTokenHash`, …).
 *
 * `status`/`publishedAt`/`completedAt`/`archivedAt`/`shareTokenHash`
 * are never written by `update()` — Firestore Rules only allow the
 * `publishExperience` Cloud Function (Admin SDK) to set those; this
 * `update()` is for the Wizard's own editable fields only. `create()`
 * always writes a fresh draft (mirrors the rules' `create` constraints:
 * `status == 'draft'`, no `shareTokenHash` field at all).
 */
@Injectable({ providedIn: 'root' })
export class FirestoreExperienceRepository implements ExperienceRepositoryPort {
  private readonly firestore = inject(Firestore);

  async getById(experienceId: string): Promise<PuzzleExperience | null> {
    const [publicSnap, privateSnap] = await Promise.all([
      getDoc(doc(this.firestore, EXPERIENCES, experienceId)),
      getDoc(doc(this.firestore, EXPERIENCES_PRIVATE, experienceId)),
    ]);

    if (!publicSnap.exists()) {
      return null;
    }

    return fromDocs(
      experienceId,
      publicSnap.data() as PublicDoc,
      privateSnap.exists() ? (privateSnap.data() as PrivateDoc) : null,
    );
  }

  /**
   * Public-doc-only, deliberately — `CreatorDashboardFacade` (its one
   * caller) and `ExperienceCardComponent` only ever read
   * `occasion`/`recipientDisplayName`/`status`/`createdAt`/`publishedAt`/`completedAt`,
   * all public fields (M5 Phase 2 perf pass: this used to also fetch
   * every result's `puzzle_experiences_private` doc — an N+1 read the
   * Dashboard never used, since `puzzle_experiences_private` only holds
   * Wizard-editing fields like `questions`/`completionMessage` that no
   * list view needs). `getById` below still joins both docs — that one
   * backs the Wizard, which genuinely needs the private fields.
   */
  async listByCreator(creatorId: string): Promise<readonly PuzzleExperience[]> {
    const publicQuery = query(
      collection(this.firestore, EXPERIENCES),
      where('creatorId', '==', creatorId),
      orderBy('createdAt', 'desc'),
    );
    const publicSnaps = await getDocs(publicQuery);

    return publicSnaps.docs.map((publicSnap) => fromDocs(publicSnap.id, publicSnap.data() as PublicDoc, null));
  }

  async create(experience: PuzzleExperience): Promise<void> {
    const batch = writeBatch(this.firestore);
    batch.set(doc(this.firestore, EXPERIENCES, experience.experienceId), toPublicDoc(experience));
    batch.set(doc(this.firestore, EXPERIENCES_PRIVATE, experience.experienceId), toPrivateDocForCreate(experience));
    await batch.commit();
  }

  async update(experienceId: string, changes: Partial<PuzzleExperience>): Promise<void> {
    const publicFields = toPublicUpdateFields(changes);
    const privateFields = toPrivateUpdateFields(changes);

    if (Object.keys(publicFields).length === 0 && Object.keys(privateFields).length === 0) {
      return;
    }

    const batch = writeBatch(this.firestore);
    if (Object.keys(publicFields).length > 0) {
      batch.update(doc(this.firestore, EXPERIENCES, experienceId), publicFields as UpdateData<PublicDoc>);
    }
    if (Object.keys(privateFields).length > 0) {
      batch.update(doc(this.firestore, EXPERIENCES_PRIVATE, experienceId), privateFields as UpdateData<PrivateDoc>);
    }
    await batch.commit();
  }
}

export function fromDocs(experienceId: string, pub: PublicDoc, priv: PrivateDoc | null): PuzzleExperience {
  return {
    experienceId,
    creatorId: pub.creatorId,
    shareTokenHash: priv?.shareTokenHash ?? null,
    occasion: pub.occasion,
    emotion: pub.emotion,
    recipientDisplayName: pub.recipientDisplayName,
    status: pub.status,
    welcomeNote: pub.welcomeNote,
    completionMessage: priv?.completionMessage ?? '',
    partnerHelpChallenge: priv?.partnerHelpChallenge ?? '',
    lockedPatternImagePath: pub.lockedPatternImagePath,
    revealImagePath: priv?.revealImagePath ?? null,
    questions: priv?.questions ?? [],
    createdAt: pub.createdAt.toDate(),
    publishedAt: pub.publishedAt?.toDate() ?? null,
    completedAt: pub.completedAt?.toDate() ?? null,
    archivedAt: pub.archivedAt?.toDate() ?? null,
  };
}

export function toPublicDoc(experience: PuzzleExperience): PublicDoc {
  return {
    creatorId: experience.creatorId,
    occasion: experience.occasion,
    emotion: experience.emotion,
    recipientDisplayName: experience.recipientDisplayName,
    status: experience.status,
    welcomeNote: experience.welcomeNote,
    lockedPatternImagePath: experience.lockedPatternImagePath,
    createdAt: Timestamp.fromDate(experience.createdAt),
    publishedAt: toTimestampOrNull(experience.publishedAt),
    completedAt: toTimestampOrNull(experience.completedAt),
    archivedAt: toTimestampOrNull(experience.archivedAt),
  };
}

/** Deliberately omits `shareTokenHash` entirely (not even `null`) — Firestore Rules reject a create that includes the key at all. */
export function toPrivateDocForCreate(experience: PuzzleExperience): Omit<PrivateDoc, 'shareTokenHash'> {
  return {
    completionMessage: experience.completionMessage,
    partnerHelpChallenge: experience.partnerHelpChallenge,
    revealImagePath: experience.revealImagePath,
    questions: experience.questions,
  };
}

const PUBLIC_UPDATE_KEYS = ['occasion', 'emotion', 'recipientDisplayName', 'welcomeNote', 'lockedPatternImagePath'] as const;
/**
 * `revealImagePath` is deliberately excluded — the M3 Wizard surfaced
 * that it must never be client-settable. It's written exactly once,
 * by the `onRevealImageUploaded` Cloud Function trigger (M2, Admin
 * SDK) after it finishes slicing the creator's uploaded original; a
 * client `update()` call is never the source of truth for it. The
 * Wizard confirms an upload succeeded by re-reading the experience via
 * `getById`, not by writing this field itself.
 */
const PRIVATE_UPDATE_KEYS = ['completionMessage', 'partnerHelpChallenge', 'questions'] as const;

export function toPublicUpdateFields(changes: Partial<PuzzleExperience>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const key of PUBLIC_UPDATE_KEYS) {
    if (changes[key] !== undefined) {
      fields[key] = changes[key];
    }
  }
  return fields;
}

export function toPrivateUpdateFields(changes: Partial<PuzzleExperience>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const key of PRIVATE_UPDATE_KEYS) {
    if (changes[key] !== undefined) {
      fields[key] = changes[key];
    }
  }
  return fields;
}

function toTimestampOrNull(value: Date | null): Timestamp | null {
  return value ? Timestamp.fromDate(value) : null;
}
