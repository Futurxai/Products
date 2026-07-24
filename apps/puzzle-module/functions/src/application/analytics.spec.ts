import { logEventSafely, maybeLogPuzzleCompleted } from './analytics';
import { createFakeEventLogStore, createFakeLogger } from './testing/fakes';
import { PieceProgress, Progress } from '../domain/models/progress.model';

function unlockedPiece(pointsAwarded: number): PieceProgress {
  return { status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded };
}

describe('logEventSafely', () => {
  it('forwards the event to the store as-is', async () => {
    const eventLogStore = createFakeEventLogStore();
    const logger = createFakeLogger();

    await logEventSafely(eventLogStore, logger, {
      eventName: 'hint.used',
      experienceId: 'exp_1',
      actorRole: 'recipient',
      payload: { questionId: 'q1', clueNumber: 1 },
    });

    expect(eventLogStore.events).toEqual([
      { eventName: 'hint.used', experienceId: 'exp_1', moduleType: 'puzzle', actorRole: 'recipient', payload: { questionId: 'q1', clueNumber: 1 } },
    ]);
  });

  it('swallows a store failure — analytics must never break a successful gameplay action', async () => {
    const eventLogStore = { logEvent: () => Promise.reject(new Error('firestore unavailable')) };
    const logger = createFakeLogger();
    const errorSpy = spyOn(logger, 'error');

    await expectAsync(
      logEventSafely(eventLogStore, logger, { eventName: 'hint.used', experienceId: 'exp_1', actorRole: 'recipient' }),
    ).toBeResolved();

    expect(errorSpy).toHaveBeenCalledWith('Failed to log analytics event', jasmine.objectContaining({ eventName: 'hint.used' }));
  });
});

describe('maybeLogPuzzleCompleted', () => {
  function progress(overrides: Partial<Progress> = {}): Progress {
    return {
      experienceId: 'exp_1',
      status: 'in_progress',
      pieces: {},
      startedAt: new Date('2026-01-01T00:00:00Z'),
      lastUpdatedAt: new Date('2026-01-01T00:10:00Z'),
      completedAt: null,
      ...overrides,
    };
  }

  it('does nothing when the experience is not yet completed', async () => {
    const eventLogStore = createFakeEventLogStore();
    await maybeLogPuzzleCompleted(eventLogStore, createFakeLogger(), 'exp_1', progress({ status: 'in_progress' }));
    expect(eventLogStore.events).toEqual([]);
  });

  it('logs puzzle.completed with score, star rating, and elapsed time once the experience completes', async () => {
    const eventLogStore = createFakeEventLogStore();
    const pieces: Record<string, PieceProgress> = {};
    for (let i = 1; i <= 9; i++) {
      pieces[`q${i}`] = unlockedPiece(100);
    }
    const completedAt = new Date('2026-01-01T00:12:00Z');

    await maybeLogPuzzleCompleted(
      eventLogStore,
      createFakeLogger(),
      'exp_1',
      progress({ status: 'completed', pieces, completedAt }),
    );

    expect(eventLogStore.events).toEqual([
      {
        eventName: 'puzzle.completed',
        experienceId: 'exp_1',
        moduleType: 'puzzle',
        actorRole: 'recipient',
        payload: { finalScore: 900, starRating: 3, timeToCompleteMs: 12 * 60 * 1000 },
      },
    ]);
  });
});
