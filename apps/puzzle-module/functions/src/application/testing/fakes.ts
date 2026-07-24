import { ExperienceStorePort } from '../../domain/ports/experience-store.port';
import { ProgressStorePort } from '../../domain/ports/progress-store.port';
import { EventLogStorePort } from '../../domain/ports/event-log-store.port';
import { PuzzleExperience } from '../../domain/models/puzzle-experience.model';
import { PieceProgress, Progress, lockedPiece } from '../../domain/models/progress.model';
import { AnalyticsEvent } from '../../domain/models/analytics-event.model';
import { QUESTION_IDS } from '../../domain/models/constants';
import { AlreadyUnlockedError, NoCluesRemainingError } from '../../domain/errors/domain-errors';
import { isExperienceComplete } from '../../domain/rules/lifecycle.rules';
import { StorageService } from '../../infrastructure/storage.service';
import { TokenService } from '../../infrastructure/token.service';
import { AuthService } from '../../infrastructure/auth.service';
import { ScopedLogger } from '../../config/logger';

/**
 * In-memory fakes for every port/service the use-cases depend on.
 * Deliberately real implementations of the interfaces (not
 * `jasmine.createSpyObj` stubs) — a fake that faithfully throws
 * `AlreadyUnlockedError`/`NoCluesRemainingError` under the same
 * conditions the real Firestore transaction would is far more useful
 * for testing use-case orchestration than a spy that returns whatever
 * a test tells it to, whether or not that's a state the real
 * implementation could ever produce.
 */

export function createFakeExperienceStore(
  seed: Record<string, PuzzleExperience> = {},
): ExperienceStorePort & { experiences: Record<string, PuzzleExperience> } {
  const experiences: Record<string, PuzzleExperience> = { ...seed };
  const tokenIndex: Record<string, string> = {};
  for (const [id, exp] of Object.entries(experiences)) {
    if (exp.shareTokenHash) {
      tokenIndex[exp.shareTokenHash] = id;
    }
  }

  return {
    experiences,
    async getExperience(experienceId) {
      return experiences[experienceId] ?? null;
    },
    async markPublished({ experienceId, shareTokenHash, publishedAt }) {
      const existing = experiences[experienceId];
      if (!existing) {
        throw new Error(`fake store: no experience ${experienceId}`);
      }
      if (existing.status !== 'draft') {
        throw new Error(`fake store: experience ${experienceId} is not draft (was ${existing.status})`);
      }
      experiences[experienceId] = { ...existing, status: 'published', publishedAt, shareTokenHash };
      tokenIndex[shareTokenHash] = experienceId;
    },
    async findExperienceIdByShareTokenHash(shareTokenHash) {
      return tokenIndex[shareTokenHash] ?? null;
    },
  };
}

export function createFakeProgressStore(): ProgressStorePort & { docs: Record<string, Progress> } {
  const docs: Record<string, Progress> = {};
  const attempts: Record<string, Record<string, number>> = {};

  return {
    docs,
    async getProgress(experienceId) {
      return docs[experienceId] ?? null;
    },
    async initializeIfAbsent(experienceId) {
      if (docs[experienceId]) {
        return docs[experienceId];
      }
      const pieces: Record<string, PieceProgress> = {};
      for (const id of QUESTION_IDS) {
        pieces[id] = lockedPiece();
      }
      const now = new Date();
      docs[experienceId] = { experienceId, status: 'in_progress', pieces, startedAt: now, lastUpdatedAt: now, completedAt: null };
      return docs[experienceId];
    },
    async recordAnswerAttempt(experienceId, questionId) {
      attempts[experienceId] ??= {};
      attempts[experienceId][questionId] = (attempts[experienceId][questionId] ?? 0) + 1;
      return attempts[experienceId][questionId];
    },
    async recordClueUsed(experienceId, questionId, availableClueCount) {
      const doc = docs[experienceId];
      const piece = doc.pieces[questionId];
      if (piece.status === 'unlocked') {
        throw new AlreadyUnlockedError(questionId);
      }
      if (piece.cluesUsed >= availableClueCount) {
        throw new NoCluesRemainingError(questionId);
      }
      const updated: PieceProgress = { ...piece, cluesUsed: piece.cluesUsed + 1 };
      docs[experienceId] = { ...doc, pieces: { ...doc.pieces, [questionId]: updated }, lastUpdatedAt: new Date() };
      return updated.cluesUsed;
    },
    async resolvePiece({ experienceId, questionId, earnedVia, cluesUsed, pointsAwarded }) {
      const doc = docs[experienceId];
      const existing = doc.pieces[questionId];
      if (existing.status === 'unlocked') {
        throw new AlreadyUnlockedError(questionId);
      }
      const resolved: PieceProgress = { status: 'unlocked', earnedVia, cluesUsed, pointsAwarded };
      const pieces = { ...doc.pieces, [questionId]: resolved };
      const complete = isExperienceComplete(pieces);
      const updated: Progress = {
        ...doc,
        pieces,
        lastUpdatedAt: new Date(),
        status: complete ? 'completed' : doc.status,
        completedAt: complete ? new Date() : doc.completedAt,
      };
      docs[experienceId] = updated;
      return updated;
    },
  };
}

export function createFakeEventLogStore(): EventLogStorePort & { events: Array<Omit<AnalyticsEvent, 'eventId' | 'timestamp'>> } {
  const events: Array<Omit<AnalyticsEvent, 'eventId' | 'timestamp'>> = [];
  return {
    events,
    async logEvent({ eventName, experienceId, actorRole, payload }) {
      events.push({ eventName, experienceId, moduleType: 'puzzle', actorRole, payload: payload ?? {} });
    },
  };
}

export function createFakeStorageService(): StorageService {
  return {
    async getPieceSignedUrl(creatorId, experienceId, questionId) {
      return `https://fake-storage.test/${creatorId}/${experienceId}/slice-${questionId}.jpg?signed=1`;
    },
    async getFullRevealSignedUrl(creatorId, experienceId) {
      return `https://fake-storage.test/${creatorId}/${experienceId}/full.jpg?signed=1`;
    },
    getPublicUrl(path) {
      return `https://fake-storage.test/public/${path}`;
    },
  };
}

export function createFakeTokenService(): TokenService {
  let counter = 0;
  return {
    generateShareToken() {
      counter += 1;
      return `pzl_fake_token_${counter}`;
    },
    hashShareToken(rawToken) {
      return `hash(${rawToken})`;
    },
  };
}

export function createFakeAuthService(): AuthService {
  return {
    async createExperienceSession(experienceId) {
      return { uid: `fake-uid-${experienceId}`, customToken: `fake-custom-token-${experienceId}` };
    },
  };
}

export function createFakeLogger(): ScopedLogger {
  return {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    domainRejection: () => undefined,
  };
}
