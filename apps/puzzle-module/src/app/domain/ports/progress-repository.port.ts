import { Observable } from 'rxjs';
import { Progress } from '../models/progress.model';

/**
 * Read access to a Recipient's progress. There is intentionally no
 * `create`/`update`/`write` method here — per the Module Contract's
 * security boundary (§8) and the Phase 5 Firestore rules, a client
 * never writes `puzzle_progress` directly; every mutation goes through
 * `PuzzleApiPort` (a Cloud Function). This port only ever reads.
 *
 * `rxjs` is used at this boundary (not just `Promise`) because a
 * realtime listener is what makes cross-device resume-on-reload work
 * (Phase 5 §11, Performance Strategy) — `watch` maps directly onto
 * Firestore's `onSnapshot` in the M2 implementation. `rxjs` is a
 * general-purpose reactive library, not an Angular-specific import, so
 * this doesn't violate the domain layer's framework-free rule the way
 * `@angular/fire` or `firebase/*` would.
 */
export interface ProgressRepositoryPort {
  getByExperienceId(experienceId: string): Promise<Progress | null>;

  /** Emits `null` if no progress document exists yet (PRD §10 Business Rule — absence means "not started"). */
  watch(experienceId: string): Observable<Progress | null>;
}
