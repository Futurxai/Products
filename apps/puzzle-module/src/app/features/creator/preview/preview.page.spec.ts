import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { PuzzlePreviewFacade } from '@application/creator/puzzle-preview.facade';
import { PuzzleExperience, draftExperience } from '@domain/models/puzzle-experience.model';
import { ScoreSummary } from '@domain/models/score.model';

import { PreviewPage } from './preview.page';

const emptyScore: ScoreSummary = { totalScore: 0, maxScore: 900, piecesUnlocked: 0, piecesRemaining: 9, starRating: null, breakdown: [] };

describe('PreviewPage', () => {
  let fixture: ComponentFixture<PreviewPage>;
  let page: PreviewPage;
  let start: jasmine.Spy;
  let experience: ReturnType<typeof signal<PuzzleExperience | null>>;
  let loading: ReturnType<typeof signal<boolean>>;
  let error: ReturnType<typeof signal<string | null>>;
  let isComplete: ReturnType<typeof signal<boolean>>;

  function configure(paramMapValues: Record<string, string>): void {
    TestBed.resetTestingModule();

    start = jasmine.createSpy('start').and.resolveTo();
    experience = signal<PuzzleExperience | null>(null);
    loading = signal(false);
    error = signal<string | null>(null);
    isComplete = signal(false);

    TestBed.configureTestingModule({
      imports: [PreviewPage],
      providers: [
        {
          provide: PuzzlePreviewFacade,
          useValue: {
            experience,
            loading,
            error,
            isComplete,
            boardImageUrl: signal<string | null>(null),
            score: signal(emptyScore),
            start,
            // Rendered as real children (PuzzleBoardComponent, QuestionModalComponent) inject this
            // same facade directly, so the fake needs their full surface too, not just PreviewPage's own.
            pieceFor: () => ({ status: 'locked', earnedVia: null, cluesUsed: 0, pointsAwarded: 0 }),
            activeQuestion: signal(null),
            activePiece: signal(null),
            activeQuestionClues: signal([]),
            canRequestClueForActive: signal(false),
            canRequestPartnerHelpForActive: signal(false),
            lastFeedback: signal(null),
            openQuestion: jasmine.createSpy('openQuestion'),
            closeQuestion: jasmine.createSpy('closeQuestion'),
            submitAnswer: jasmine.createSpy('submitAnswer'),
            requestClue: jasmine.createSpy('requestClue'),
            requestPartnerHelp: jasmine.createSpy('requestPartnerHelp'),
            restart: jasmine.createSpy('restart'),
          },
        },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(paramMapValues) } } },
      ],
    });

    fixture = TestBed.createComponent(PreviewPage);
    page = fixture.componentInstance;
  }

  it('starts the preview session for the routed experienceId', async () => {
    configure({ experienceId: 'exp_1' });
    await page.ngOnInit();
    expect(start).toHaveBeenCalledWith('exp_1');
  });

  it('does nothing when no experienceId param is present', async () => {
    configure({});
    await page.ngOnInit();
    expect(start).not.toHaveBeenCalled();
  });

  it('shows the loader while loading', async () => {
    configure({ experienceId: 'exp_1' });
    loading.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-loader')).not.toBeNull();
  });

  it('shows the error message when loading fails', () => {
    configure({ experienceId: 'exp_1' });
    error.set('This puzzle could not be found.');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('This puzzle could not be found.');
  });

  it('shows the board once the experience is loaded and incomplete', () => {
    configure({ experienceId: 'exp_1' });
    experience.set(draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: 'Ananya' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-puzzle-board')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-completion-screen')).toBeNull();
  });

  it('shows the completion screen once the play-through is complete', () => {
    configure({ experienceId: 'exp_1' });
    experience.set(draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: 'Ananya' }));
    isComplete.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-completion-screen')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-puzzle-board')).toBeNull();
  });

  it('backHref points back to the experience\'s Wizard Review step', () => {
    configure({ experienceId: 'exp_1' });
    fixture.detectChanges();
    expect(page['backHref']()).toBe('/creator/wizard/exp_1');
  });

  it('backHref falls back to the dashboard when there is no experienceId', () => {
    configure({});
    fixture.detectChanges();
    expect(page['backHref']()).toBe('/creator');
  });
});
