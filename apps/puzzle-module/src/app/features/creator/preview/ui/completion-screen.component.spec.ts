import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { PuzzlePreviewFacade } from '@application/creator/puzzle-preview.facade';
import { ScoreSummary } from '@domain/models/score.model';
import { PuzzleExperience, draftExperience } from '@domain/models/puzzle-experience.model';

import { CompletionScreenComponent } from './completion-screen.component';

function score(overrides: Partial<ScoreSummary> = {}): ScoreSummary {
  return { totalScore: 800, maxScore: 900, piecesUnlocked: 9, piecesRemaining: 0, starRating: 3, breakdown: [], ...overrides };
}

describe('CompletionScreenComponent', () => {
  let fixture: ComponentFixture<CompletionScreenComponent>;
  let restart: jasmine.Spy;
  let boardImageUrl: ReturnType<typeof signal<string | null>>;
  let experience: ReturnType<typeof signal<PuzzleExperience | null>>;
  let scoreSignal: ReturnType<typeof signal<ScoreSummary>>;

  function configure(): void {
    restart = jasmine.createSpy('restart');
    boardImageUrl = signal<string | null>('blob:fake-url');
    experience = signal<PuzzleExperience | null>(
      draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: 'Ananya' }),
    );
    experience.set({ ...experience()!, completionMessage: 'You remembered every single one!' });
    scoreSignal = signal(score());

    TestBed.configureTestingModule({
      imports: [CompletionScreenComponent],
      providers: [
        {
          provide: PuzzlePreviewFacade,
          useValue: { boardImageUrl, experience, score: scoreSignal, restart },
        },
      ],
    });

    fixture = TestBed.createComponent(CompletionScreenComponent);
    fixture.detectChanges();
  }

  beforeEach(() => configure());

  it('shows 3 filled stars and the matching label for a 3-star score', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('★★★');
    expect(text).toContain('You know them by heart');
  });

  it('shows the score and completion message', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('800 / 900 points');
    expect(text).toContain('You remembered every single one!');
  });

  it('shows partially-filled stars for a lower rating', () => {
    scoreSignal.set(score({ totalScore: 615, starRating: 2 }));
    fixture = TestBed.createComponent(CompletionScreenComponent);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('★★☆');
    expect(text).toContain('You know them well');
  });

  it('renders the reveal image when a board image is available', () => {
    const img: HTMLImageElement = fixture.nativeElement.querySelector('.completion-screen__reveal-image');
    expect(img.src).toContain('blob:fake-url');
  });

  it('renders a placeholder when no board image is available', () => {
    boardImageUrl.set(null);
    fixture = TestBed.createComponent(CompletionScreenComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.completion-screen__reveal-image')).toBeNull();
    expect(fixture.nativeElement.querySelector('.completion-screen__reveal-placeholder')).not.toBeNull();
  });

  it('restart delegates to the facade', () => {
    fixture.componentInstance['restart']();
    expect(restart).toHaveBeenCalled();
  });
});
