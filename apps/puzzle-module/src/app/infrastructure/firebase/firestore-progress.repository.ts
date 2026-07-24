import { Injectable, inject } from '@angular/core';
import { Firestore, Timestamp, doc, getDoc, onSnapshot } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

import { ProgressRepositoryPort } from '@domain/ports/progress-repository.port';
import { PieceProgress, Progress } from '@domain/models/progress.model';

const PROGRESS = 'puzzle_progress';

/**
 * `attempts` is deliberately not part of `ProgressDoc` here — it's a
 * server-internal rate-limiting counter (`ProgressStorePort.recordAnswerAttempt`,
 * M2), written by the Admin SDK and never read by the client. Reading
 * only the fields the domain `Progress` model actually declares keeps
 * this adapter honest about what the Recipient UI is allowed to depend
 * on.
 */
interface ProgressDoc {
  status: 'in_progress' | 'completed';
  pieces: Record<string, PieceProgress>;
  startedAt: Timestamp;
  lastUpdatedAt: Timestamp;
  completedAt: Timestamp | null;
}

/**
 * `ProgressRepositoryPort` implemented against `@angular/fire/firestore`,
 * read-only per the port's own contract — every write to
 * `puzzle_progress/{experienceId}` happens exclusively inside
 * `functions/src/infrastructure/firestore-progress.store.ts` (M2, Admin
 * SDK); Firestore Rules reject a client write outright
 * (`allow write: if false`). `watch()` is what makes the Puzzle Board
 * (M4 Phase 3) update live as `submitAnswer`/`requestClue`/
 * `requestPartnerHelpReveal` calls resolve server-side — those Cloud
 * Functions write the document, this listener is what tells the UI.
 */
@Injectable({ providedIn: 'root' })
export class FirestoreProgressRepository implements ProgressRepositoryPort {
  private readonly firestore = inject(Firestore);

  async getByExperienceId(experienceId: string): Promise<Progress | null> {
    const snap = await getDoc(doc(this.firestore, PROGRESS, experienceId));
    return snap.exists() ? toDomainProgress(experienceId, snap.data() as ProgressDoc) : null;
  }

  watch(experienceId: string): Observable<Progress | null> {
    return new Observable<Progress | null>((subscriber) => {
      const unsubscribe = onSnapshot(
        doc(this.firestore, PROGRESS, experienceId),
        (snap) => subscriber.next(snap.exists() ? toDomainProgress(experienceId, snap.data() as ProgressDoc) : null),
        (error) => subscriber.error(error),
      );
      return unsubscribe;
    });
  }
}

export function toDomainProgress(experienceId: string, docData: ProgressDoc): Progress {
  return {
    experienceId,
    status: docData.status,
    pieces: docData.pieces,
    startedAt: docData.startedAt.toDate(),
    lastUpdatedAt: docData.lastUpdatedAt.toDate(),
    completedAt: docData.completedAt ? docData.completedAt.toDate() : null,
  };
}
