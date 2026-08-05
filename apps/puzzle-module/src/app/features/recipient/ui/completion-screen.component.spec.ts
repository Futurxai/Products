import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { PuzzleSessionFacade } from '@application/recipient/puzzle-session.facade';
import { CompletionSummarySuccess } from '@domain/ports/puzzle-api.port';

import { CompletionScreenComponent } from './completion-screen.component';

function summary(overrides: Partial<CompletionSummarySuccess> = {}): CompletionSummarySuccess {
  return {
    ok: true,
    finalScore: 800,
    maxScore: 900,
    starRating: 3,
    starLabel: 'You know them by heart',
    completionMessage: 'You remembered every single one!',
    finalRevealImageUrl: 'https://x/reveal.jpg',
    perQuestionBreakdown: [],
    ...overrides,
  };
}

describe('CompletionScreenComponent', () => {
  let fixture: ComponentFixture<CompletionScreenComponent>;
  let completionSummary: ReturnType<typeof signal<CompletionSummarySuccess | null>>;
  let loadingCompletion: ReturnType<typeof signal<boolean>>;
  let completionError: ReturnType<typeof signal<string | null>>;
  let loadCompletionSummary: jasmine.Spy;

  function configure(): void {
    completionSummary = signal<CompletionSummarySuccess | null>(summary());
    loadingCompletion = signal(false);
    completionError = signal<string | null>(null);
    loadCompletionSummary = jasmine.createSpy('loadCompletionSummary').and.resolveTo(undefined);

    TestBed.configureTestingModule({
      imports: [CompletionScreenComponent],
      providers: [
        {
          provide: PuzzleSessionFacade,
          useValue: { completionSummary, loadingCompletion, completionError, loadCompletionSummary },
        },
      ],
    });

    fixture = TestBed.createComponent(CompletionScreenComponent);
    fixture.detectChanges();
  }

  beforeEach(() => configure());

  it('shows 3 filled stars and the server-authored label for a 3-star score', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('★★★');
    expect(text).toContain('You know them by heart');
  });

  it('shows the score and completion message from the real completion summary', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('800 / 900 points');
    expect(text).toContain('You remembered every single one!');
  });

  it('shows partially-filled stars for a lower rating', () => {
    completionSummary.set(summary({ finalScore: 615, starRating: 2, starLabel: 'You know them well' }));
    fixture = TestBed.createComponent(CompletionScreenComponent);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('★★☆');
  });

  it('renders the full, unsliced reveal image from the completion summary', () => {
    const img: HTMLImageElement = fixture.nativeElement.querySelector('.completion-screen__reveal-image');
    expect(img.src).toBe('https://x/reveal.jpg');
  });

  it('shows a loading state while the completion summary is being fetched', () => {
    completionSummary.set(null);
    loadingCompletion.set(true);
    fixture = TestBed.createComponent(CompletionScreenComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-loader')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.completion-screen__reveal-image')).toBeNull();
  });

  it('shows an error and a retry button when the fetch failed', () => {
    completionSummary.set(null);
    completionError.set("Couldn't reach the server. Check your connection and try again.");
    fixture = TestBed.createComponent(CompletionScreenComponent);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain("Couldn't reach the server");
  });

  it('retry calls loadCompletionSummary again', () => {
    fixture.componentInstance['retry']();
    expect(loadCompletionSummary).toHaveBeenCalled();
  });
});
