import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PuzzleSessionFacade } from '@application/recipient/puzzle-session.facade';
import { PieceProgress, lockedPiece } from '@domain/models/progress.model';
import { ResolveShareTokenSuccess } from '@domain/ports/puzzle-api.port';
import { computeScore } from '@domain/rules/scoring.rules';

import { PuzzleBoardComponent } from './puzzle-board.component';

function publicMeta(): ResolveShareTokenSuccess['publicMeta'] {
  return {
    occasion: 'Anniversary',
    emotion: 'Love',
    recipientDisplayName: 'Ananya',
    welcomeNote: 'Hi!',
    status: 'published',
    lockedPatternImageUrl: 'https://x/pattern.svg',
    questions: [],
    partnerHelpChallenge: 'Ask nicely',
  };
}

describe('PuzzleBoardComponent', () => {
  let fixture: ComponentFixture<PuzzleBoardComponent>;
  let pieces: Record<string, PieceProgress>;
  let pieceImages: Record<string, string>;
  let openQuestion: jasmine.Spy;

  function configure(): void {
    pieces = {};
    for (let i = 1; i <= 9; i++) {
      pieces[`q${i}`] = lockedPiece();
    }
    pieceImages = {};
    openQuestion = jasmine.createSpy('openQuestion');

    TestBed.configureTestingModule({
      imports: [PuzzleBoardComponent],
      providers: [
        {
          provide: PuzzleSessionFacade,
          useValue: {
            pieceFor: (id: string) => pieces[id],
            pieceImageFor: (id: string) => pieceImages[id] ?? null,
            publicMeta: () => publicMeta(),
            score: () => computeScore(pieces),
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

  it('renders locked tiles as buttons showing the locked pattern image, unlocked tiles as inert divs', () => {
    pieces['q1'] = { status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 };
    pieceImages['q1'] = 'https://x/slice-q1.jpg';
    fixture = TestBed.createComponent(PuzzleBoardComponent);
    fixture.detectChanges();

    const unlockedTiles = fixture.nativeElement.querySelectorAll('.puzzle-board__tile--unlocked');
    const lockedTiles: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.puzzle-board__tile--locked');
    expect(unlockedTiles.length).toBe(1);
    expect(lockedTiles.length).toBe(8);
    expect(lockedTiles[0].style.backgroundImage).toContain('pattern.svg');
  });

  it('renders the piece image inside an unlocked tile', () => {
    pieces['q1'] = { status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 };
    pieceImages['q1'] = 'https://x/slice-q1.jpg';
    fixture = TestBed.createComponent(PuzzleBoardComponent);
    fixture.detectChanges();

    const img: HTMLImageElement = fixture.nativeElement.querySelector('.puzzle-board__piece-image');
    expect(img.src).toBe('https://x/slice-q1.jpg');
  });

  it('clicking a locked tile opens that question', () => {
    const firstTile: HTMLButtonElement = fixture.nativeElement.querySelector('.puzzle-board__tile--locked');
    firstTile.click();
    expect(openQuestion).toHaveBeenCalledWith('q1');
  });

  it('shows the unlocked-count progress label and running score', () => {
    pieces['q1'] = { status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 };
    pieces['q2'] = { status: 'unlocked', earnedVia: 'direct', cluesUsed: 0, pointsAwarded: 100 };
    fixture = TestBed.createComponent(PuzzleBoardComponent);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('2 of 9 pieces unlocked');
    expect(text).toContain('200 points so far');
  });
});
