import { Timestamp } from '@angular/fire/firestore';

import { lockedPiece } from '@domain/models/progress.model';

import { toDomainProgress } from './firestore-progress.repository';

describe('firestore-progress.repository mapping', () => {
  it('toDomainProgress converts Firestore Timestamps to Dates and passes pieces through as-is', () => {
    const startedAt = new Date('2026-02-01T10:00:00Z');
    const lastUpdatedAt = new Date('2026-02-01T10:05:00Z');
    const pieces = { q1: { status: 'unlocked' as const, earnedVia: 'direct' as const, cluesUsed: 0, pointsAwarded: 100 }, q2: lockedPiece() };

    const result = toDomainProgress('exp_1', {
      status: 'in_progress',
      pieces,
      startedAt: Timestamp.fromDate(startedAt),
      lastUpdatedAt: Timestamp.fromDate(lastUpdatedAt),
      completedAt: null,
    });

    expect(result).toEqual({
      experienceId: 'exp_1',
      status: 'in_progress',
      pieces,
      startedAt,
      lastUpdatedAt,
      completedAt: null,
    });
  });

  it('toDomainProgress converts a non-null completedAt', () => {
    const completedAt = new Date('2026-02-01T11:00:00Z');

    const result = toDomainProgress('exp_1', {
      status: 'completed',
      pieces: {},
      startedAt: Timestamp.fromDate(new Date('2026-02-01T10:00:00Z')),
      lastUpdatedAt: Timestamp.fromDate(new Date('2026-02-01T10:05:00Z')),
      completedAt: Timestamp.fromDate(completedAt),
    });

    expect(result.completedAt).toEqual(completedAt);
  });
});
