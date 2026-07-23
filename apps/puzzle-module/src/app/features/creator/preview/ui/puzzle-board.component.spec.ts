import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { PuzzlePreviewFacade } from '@application/creator/puzzle-preview.facade';
import { PieceProgress, lockedPiece } from '@domain/models/progress.model';
import { ScoreSummary } from '@domain/models/score.model';

import { PuzzleBoardComponent } from './puzzle-board.component';

function emptyScore(piecesUnlocked: number): ScoreSummary {
  return { totalScore: 0, maxScore: 900, piecesUnlocked, piecesRemaining: 9 - piecesUnlocked, starRating: null, breakdown: [] };
}

describe('PuzzleBoardComponent', () => {
  let fixture: ComponentFixture<PuzzleBoardComponent>;
  let pieces: Record<string, PieceProgress>;
  let boardImageUrl: ReturnType<typeof signal<string | null>>;
  let openQuestion: jasmine.Spy;

  function configure(): void {
    pieces = {};
    for (let i = 1; i <= 9; i++) {
      pieces[`q${i}`] = lockedPiece();
    }
    boardImageUrl = signal<string | null>(null);
    openQuestion = jasmine.createSpy('openQuestion');

    TestBed.configureTestingModule({
      imports: [PuzzleBoardComponent],
      providers: [
        {
          provide: PuzzlePreviewFacade,
          useValue: {
            pieceFor: (id: string) => pieces[id],
            boardImageUrl,
            score: () => emptyScore(Object.values(pieces).filter((p) => p.status === 'unlocked').length),
            openQuestion,
          },
        },
      ],
    });

    fixture = TestBed.createComponent(PuzzleBoardComponent);
    fixture.detectChanges();
  }

  beforeEach(() => configure());

  it('renders 9 tiles', () => {
    const tiles = fixture.nativeElement.querySelectorAll('.puzzle-board__tile');
    expect(tiles.length).toBe(9);
  });

  it('renders locked tiles as buttons, unlocked tiles as inert divs', () => {
    pieces['q1'] = { status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 };
    fixture = TestBed.createComponent(PuzzleBoardComponent);
    fixture.detectChanges();

    const unlockedTiles = fixture.nativeElement.querySelectorAll('.puzzle-board__tile--unlocked');
    const lockedTiles = fixture.nativeElement.querySelectorAll('.puzzle-board__tile--locked');
    expect(unlockedTiles.length).toBe(1);
    expect(lockedTiles.length).toBe(8);
  });

  it('clicking a locked tile opens that question', () => {
    const firstTile: HTMLButtonElement = fixture.nativeElement.querySelector('.puzzle-board__tile--locked');
    firstTile.click();
    expect(openQuestion).toHaveBeenCalledWith('q1');
  });

  it('shows the unlocked-count progress label', () => {
    pieces['q1'] = { status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 };
    pieces['q2'] = { status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 };
    fixture = TestBed.createComponent(PuzzleBoardComponent);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('2 of 9 pieces unlocked');
  });
});
