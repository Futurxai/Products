import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { PuzzleSessionFacade, RecipientLinkErrorKind, RecipientLinkStatus } from '@application/recipient/puzzle-session.facade';
import { lockedPiece } from '@domain/models/progress.model';
import { ResolveShareTokenSuccess } from '@domain/ports/puzzle-api.port';
import { ScoreSummary } from '@domain/models/score.model';

import { ExperiencePage } from './experience.page';

const EMPTY_SCORE: ScoreSummary = { totalScore: 0, maxScore: 900, piecesUnlocked: 0, piecesRemaining: 9, starRating: null, breakdown: [] };

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

describe('ExperiencePage', () => {
  let fixture: ComponentFixture<ExperiencePage>;
  let page: ExperiencePage;
  let resolveLink: jasmine.Spy;
  let linkStatus: ReturnType<typeof signal<RecipientLinkStatus>>;
  let errorMessage: ReturnType<typeof signal<string | null>>;
  let errorKind: ReturnType<typeof signal<RecipientLinkErrorKind | null>>;
  let meta: ReturnType<typeof signal<ResolveShareTokenSuccess['publicMeta'] | null>>;
  let isComplete: ReturnType<typeof signal<boolean>>;

  function configure(): void {
    TestBed.resetTestingModule();

    resolveLink = jasmine.createSpy('resolveLink').and.resolveTo();
    linkStatus = signal<RecipientLinkStatus>('idle');
    errorMessage = signal<string | null>(null);
    errorKind = signal<RecipientLinkErrorKind | null>(null);
    meta = signal<ResolveShareTokenSuccess['publicMeta'] | null>(null);
    isComplete = signal(false);

    TestBed.configureTestingModule({
      imports: [ExperiencePage],
      providers: [
        {
          provide: PuzzleSessionFacade,
          useValue: {
            resolveLink,
            linkStatus,
            errorMessage,
            errorKind,
            publicMeta: meta,
            isComplete,
            // Rendered as real children (PuzzleBoardComponent, QuestionModalComponent,
            // CompletionScreenComponent) inject this same facade directly, so the fake
            // needs their full surface too, not just ExperiencePage's own.
            pieceFor: () => lockedPiece(),
            pieceImageFor: () => null,
            score: signal(EMPTY_SCORE),
            activeQuestion: signal(null),
            activePiece: signal(null),
            activePieceImageUrl: signal(null),
            isActiveSolved: signal(false),
            activeQuestionClues: signal([]),
            canRequestClueForActive: signal(false),
            requestingClue: signal(false),
            clueError: signal(null),
            canRequestPartnerHelpForActive: signal(false),
            requestingPartnerHelp: signal(false),
            partnerHelpError: signal(null),
            lastPieceResolution: signal(null),
            answerError: signal(null),
            submitting: signal(false),
            completionSummary: signal(null),
            loadingCompletion: signal(false),
            completionError: signal(null),
            openQuestion: jasmine.createSpy('openQuestion'),
            closeQuestion: jasmine.createSpy('closeQuestion'),
            submitAnswer: jasmine.createSpy('submitAnswer').and.resolveTo(undefined),
            requestClue: jasmine.createSpy('requestClue').and.resolveTo(undefined),
            requestPartnerHelp: jasmine.createSpy('requestPartnerHelp').and.resolveTo(undefined),
            loadCompletionSummary: jasmine.createSpy('loadCompletionSummary').and.resolveTo(undefined),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(ExperiencePage);
    page = fixture.componentInstance;
    fixture.componentRef.setInput('shareToken', 'pzl_abc');
  }

  beforeEach(() => configure());

  it('resolves the link for the routed shareToken on init', async () => {
    await page.ngOnInit();
    expect(resolveLink).toHaveBeenCalledWith('pzl_abc');
  });

  it('does nothing when no shareToken is present', async () => {
    fixture.componentRef.setInput('shareToken', '');
    await page.ngOnInit();
    expect(resolveLink).not.toHaveBeenCalled();
  });

  it('shows the loader while the link is idle/resolving', () => {
    linkStatus.set('resolving');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-loader')).not.toBeNull();
  });

  it('shows the invalid-link message and no retry button for a business failure', () => {
    linkStatus.set('invalid');
    errorMessage.set('This link is invalid or has expired.');
    errorKind.set('invalid_link');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('This link is invalid or has expired.');
    expect(fixture.nativeElement.querySelector('app-button')).toBeNull();
  });

  it('shows a retry button for an infra failure', () => {
    linkStatus.set('invalid');
    errorMessage.set("Couldn't reach the server. Check your connection and try again.");
    errorKind.set('infra');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-button')).not.toBeNull();
  });

  it('retryResolve calls resolveLink again with the same token', () => {
    page['retryResolve']();
    expect(resolveLink).toHaveBeenCalledWith('pzl_abc');
  });

  it('shows the welcome screen once ready, before the puzzle is started', () => {
    linkStatus.set('ready');
    meta.set(publicMeta());
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-welcome-screen')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-puzzle-board')).toBeNull();
  });

  it('shows the board once the puzzle is started and incomplete', () => {
    linkStatus.set('ready');
    meta.set(publicMeta());
    fixture.detectChanges();

    page['onStartPuzzle']();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-puzzle-board')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-question-modal')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-welcome-screen')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-completion-screen')).toBeNull();
  });

  it('shows the completion screen once the puzzle is started and complete', () => {
    linkStatus.set('ready');
    meta.set(publicMeta());
    isComplete.set(true);
    fixture.detectChanges();

    page['onStartPuzzle']();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-completion-screen')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-puzzle-board')).toBeNull();
  });
});
