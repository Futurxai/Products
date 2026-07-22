import { PieceProgress } from '../models/progress.model';
import { computeScore, pointsForPiece, starRatingFor } from './scoring.rules';

describe('pointsForPiece', () => {
  it('awards 100 for a direct correct answer', () => {
    expect(pointsForPiece('direct', 0)).toBe(100);
  });

  it('awards 75/50/30 for a clue-assisted answer, tiered by clues used', () => {
    expect(pointsForPiece('clue', 1)).toBe(75);
    expect(pointsForPiece('clue', 2)).toBe(50);
    expect(pointsForPiece('clue', 3)).toBe(30);
  });

  it('awards a flat 10 for a partner-help reveal, regardless of how many clues that question actually had', () => {
    expect(pointsForPiece('partner_help', 3)).toBe(10);
    expect(pointsForPiece('partner_help', 1)).toBe(10); // a question authored with only 1 clue
    expect(pointsForPiece('partner_help', 0)).toBe(10); // a question authored with zero clues
  });

  it('rejects a direct answer recorded with clues used — inconsistent state', () => {
    expect(() => pointsForPiece('direct', 1)).toThrowError(/expected 0/);
  });

  it('rejects a clue-earned piece with an out-of-range clue count', () => {
    expect(() => pointsForPiece('clue', 0)).toThrowError(/expected 1, 2, or 3/);
    expect(() => pointsForPiece('clue', 4)).toThrowError(/expected 1, 2, or 3/);
  });

  it('rejects a partner-help cluesUsed value outside the domain-wide 0..3 range', () => {
    expect(() => pointsForPiece('partner_help', -1)).toThrowError(/out of range/);
    expect(() => pointsForPiece('partner_help', 4)).toThrowError(/out of range/);
  });
});

describe('starRatingFor', () => {
  // Boundary cases lifted directly from
  // docs/puzzle-module/test-data/05-score-reward-examples.json —
  // keeping the test data and the rule it validates in sync on purpose.
  it('awards 3 stars at and above the 800 threshold', () => {
    expect(starRatingFor(900)).toBe(3);
    expect(starRatingFor(800)).toBe(3); // lowest possible 3-star score
  });

  it('awards 2 stars from 500 up to 799', () => {
    expect(starRatingFor(799)).toBe(2); // highest possible 2-star score
    expect(starRatingFor(500)).toBe(2); // lowest possible 2-star score
  });

  it('awards 1 star below 500, and never 0', () => {
    expect(starRatingFor(499)).toBe(1); // highest possible 1-star score
    expect(starRatingFor(90)).toBe(1); // worst case: all 9 pieces via partner-help
    expect(starRatingFor(0)).toBe(1);
  });
});

describe('computeScore', () => {
  function piece(overrides: Partial<PieceProgress>): PieceProgress {
    return { status: 'locked', earnedVia: null, cluesUsed: 0, pointsAwarded: 0, ...overrides };
  }

  it('matches exp_001: a completed run landing exactly on the 3-star boundary (800/900)', () => {
    const pieces = {
      q1: piece({ status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 }),
      q2: piece({ status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 }),
      q3: piece({ status: 'unlocked', earnedVia: 'clue', cluesUsed: 1, pointsAwarded: 75 }),
      q4: piece({ status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 }),
      q5: piece({ status: 'unlocked', earnedVia: 'clue', cluesUsed: 2, pointsAwarded: 50 }),
      q6: piece({ status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 }),
      q7: piece({ status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 }),
      q8: piece({ status: 'unlocked', earnedVia: 'clue', cluesUsed: 1, pointsAwarded: 75 }),
      q9: piece({ status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 }),
    };

    const summary = computeScore(pieces);

    expect(summary.totalScore).toBe(800);
    expect(summary.maxScore).toBe(900);
    expect(summary.piecesUnlocked).toBe(9);
    expect(summary.piecesRemaining).toBe(0);
    expect(summary.starRating).toBe(3);
    expect(summary.breakdown.length).toBe(9);
  });

  it('matches exp_008: a flawless run (900/900, zero clues used anywhere)', () => {
    const pieces: Record<string, PieceProgress> = {};
    for (let i = 1; i <= 9; i++) {
      pieces[`q${i}`] = piece({ status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 });
    }

    const summary = computeScore(pieces);

    expect(summary.totalScore).toBe(900);
    expect(summary.starRating).toBe(3);
  });

  it('matches exp_005: a completed run with heavy clue/partner-help use (615/900, 2 stars)', () => {
    const pieces = {
      q1: piece({ status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 }),
      q2: piece({ status: 'unlocked', earnedVia: 'clue', cluesUsed: 1, pointsAwarded: 75 }),
      q3: piece({ status: 'unlocked', earnedVia: 'clue', cluesUsed: 2, pointsAwarded: 50 }),
      q4: piece({ status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 }),
      q5: piece({ status: 'unlocked', earnedVia: 'partner_help', cluesUsed: 3, pointsAwarded: 10 }),
      q6: piece({ status: 'unlocked', earnedVia: 'clue', cluesUsed: 1, pointsAwarded: 75 }),
      q7: piece({ status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 }),
      q8: piece({ status: 'unlocked', earnedVia: 'clue', cluesUsed: 3, pointsAwarded: 30 }),
      q9: piece({ status: 'unlocked', earnedVia: 'clue', cluesUsed: 1, pointsAwarded: 75 }),
    };

    const summary = computeScore(pieces);

    expect(summary.totalScore).toBe(615);
    expect(summary.starRating).toBe(2);
  });

  it('matches exp_002: an in-progress run — provisional score, no star rating yet', () => {
    const pieces = {
      q1: piece({ status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 }),
      q2: piece({ status: 'unlocked', earnedVia: 'clue', cluesUsed: 1, pointsAwarded: 75 }),
      q3: piece({ status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 }),
      q4: piece({ status: 'unlocked', earnedVia: 'clue', cluesUsed: 2, pointsAwarded: 50 }),
      q5: piece({ status: 'unlocked', earnedVia: 'partner_help', cluesUsed: 3, pointsAwarded: 10 }),
      q6: piece({ status: 'locked' }),
      q7: piece({ status: 'locked' }),
      q8: piece({ status: 'locked' }),
      q9: piece({ status: 'locked' }),
    };

    const summary = computeScore(pieces);

    expect(summary.totalScore).toBe(335);
    expect(summary.piecesUnlocked).toBe(5);
    expect(summary.piecesRemaining).toBe(4);
    expect(summary.starRating).toBeNull();
  });

  it('returns a zero summary for a session with no pieces unlocked yet', () => {
    const pieces: Record<string, PieceProgress> = {};
    for (let i = 1; i <= 9; i++) {
      pieces[`q${i}`] = piece({ status: 'locked' });
    }

    const summary = computeScore(pieces);

    expect(summary.totalScore).toBe(0);
    expect(summary.piecesUnlocked).toBe(0);
    expect(summary.breakdown).toEqual([]);
    expect(summary.starRating).toBeNull();
  });
});
