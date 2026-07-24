import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';

import { PieceProgress, Progress, lockedPiece } from '@domain/models/progress.model';
import { RecipientQuestionView } from '@domain/models/question.model';
import { CompletionSummarySuccess, ResolveShareTokenSuccess, SubmitAnswerResult } from '@domain/ports/puzzle-api.port';
import { ScoreSummary } from '@domain/models/score.model';
import { computeScore } from '@domain/rules/scoring.rules';
import { canRequestPartnerHelp, isExperienceComplete } from '@domain/rules/lifecycle.rules';
import { MAX_CLUES_PER_QUESTION } from '@domain/models/constants';

import { PUZZLE_API_PORT } from '../creator/publish.tokens';
import { PROGRESS_REPOSITORY_PORT, RECIPIENT_SESSION_PORT } from './recipient.tokens';

export type RecipientLinkStatus = 'idle' | 'resolving' | 'invalid' | 'ready';
/** Mirrors `PublishErrorKind`'s split (`publish-experience.facade.ts`) — a business rejection already has a server-authored, human-readable `message`; an infra failure doesn't, so the UI needs a generic one. */
export type RecipientLinkErrorKind = 'invalid_link' | 'infra';

/**
 * The Signal store the single `/e/:shareToken` route page injects (M4
 * Phase 1). Owns the Recipient's entire entry sequence: resolve the
 * share token via the real `resolveShareToken` Cloud Function, sign in
 * with the anonymous custom token it mints, then start a realtime
 * watch on `puzzle_progress/{experienceId}` — the same document every
 * later gameplay call (`submitAnswer`, `requestClue`, ...) writes, so
 * the Puzzle Board can stay purely reactive to it instead of each
 * facade method manually patching local state.
 *
 * A business failure (`{ ok: false, error: 'TOKEN_NOT_FOUND', ... }`,
 * or any other code this callable could ever return) and a genuine
 * infra failure (offline, `functions/unavailable`, or the sign-in call
 * itself rejecting) both land the UI on the same `'invalid'` status —
 * from the Recipient's point of view "the link doesn't work" either
 * way — but `errorKind` is kept distinct so the page can still choose
 * a retry affordance for `'infra'` and not for `'invalid_link'`.
 */
@Injectable({ providedIn: 'root' })
export class PuzzleSessionFacade {
  private readonly puzzleApi = inject(PUZZLE_API_PORT);
  private readonly recipientSession = inject(RECIPIENT_SESSION_PORT);
  private readonly progressRepository = inject(PROGRESS_REPOSITORY_PORT);

  private readonly _linkStatus = signal<RecipientLinkStatus>('idle');
  private readonly _errorMessage = signal<string | null>(null);
  private readonly _errorKind = signal<RecipientLinkErrorKind | null>(null);
  private readonly _experienceId = signal<string | null>(null);
  private readonly _publicMeta = signal<ResolveShareTokenSuccess['publicMeta'] | null>(null);
  private readonly _progress = signal<Progress | null>(null);

  /**
   * Signed piece-slice image URLs, keyed by `questionId` — seeded from
   * `resolveShareToken`'s `unlockedPieceImages` (already-unlocked
   * pieces from a prior visit) and topped up with each newly-earned
   * piece's `pieceImageUrl` as `submitAnswer`/`requestPartnerHelpReveal`
   * responses arrive. There is no Cloud Function that re-mints an
   * already-known piece's URL, so this cache — not a re-fetch — is the
   * only place a previously-unlocked tile's image comes from within a
   * live session.
   */
  private readonly _pieceImages = signal<Readonly<Record<string, string>>>({});
  private readonly _activeQuestionId = signal<string | null>(null);
  private readonly _submitting = signal(false);
  /** The full raw result of the most recent `submitAnswer` call for the active question — drives the modal's correct/incorrect feedback. Cleared whenever a different question opens. */
  private readonly _lastSubmitOutcome = signal<SubmitAnswerResult | null>(null);
  private readonly _answerError = signal<string | null>(null);

  /**
   * Revealed clue text, session-local only, keyed by `questionId` — the
   * server never re-sends a clue's text on any other call (not
   * `resolveShareToken`, not the realtime `puzzle_progress` watch,
   * which only ever stores `cluesUsed`, a count, never the text
   * itself). A page reload loses the clue TEXT but not the fact that
   * clues were used — `pieceFor(questionId).cluesUsed` still comes from
   * real progress and survives a reload; this is a documented,
   * accepted limitation, not a bug.
   */
  private readonly _revealedClues = signal<Readonly<Record<string, readonly string[]>>>({});
  /** How many MORE clues the server says remain for a question, once known — `undefined` means "not asked yet," not "zero." Lets the UI hide "Get a clue" for a question authored with fewer than `MAX_CLUES_PER_QUESTION` clues without ever knowing that count ahead of time (Module Contract §8). */
  private readonly _clueNumbersRemaining = signal<Readonly<Record<string, number>>>({});
  private readonly _requestingClue = signal(false);
  private readonly _clueError = signal<string | null>(null);

  /** Set on a correct `submitAnswer` OR a successful `requestPartnerHelpReveal` — one shape for "how was this piece earned," regardless of which of the two calls earned it. */
  private readonly _lastPieceResolution = signal<{ message: string; points: number } | null>(null);
  private readonly _requestingPartnerHelp = signal(false);
  private readonly _partnerHelpError = signal<string | null>(null);

  private readonly _completionSummary = signal<CompletionSummarySuccess | null>(null);
  private readonly _loadingCompletion = signal(false);
  private readonly _completionError = signal<string | null>(null);
  /** Guards the auto-fetch effect below from firing more than once per session — `loadCompletionSummary()` itself stays freely callable for an explicit retry after `completionError`. */
  private completionRequested = false;

  readonly linkStatus = this._linkStatus.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly errorKind = this._errorKind.asReadonly();
  readonly experienceId = this._experienceId.asReadonly();
  readonly publicMeta = this._publicMeta.asReadonly();
  readonly progress = this._progress.asReadonly();
  readonly submitting = this._submitting.asReadonly();
  readonly lastSubmitOutcome = this._lastSubmitOutcome.asReadonly();
  readonly answerError = this._answerError.asReadonly();
  readonly requestingClue = this._requestingClue.asReadonly();
  readonly clueError = this._clueError.asReadonly();
  readonly lastPieceResolution = this._lastPieceResolution.asReadonly();
  readonly requestingPartnerHelp = this._requestingPartnerHelp.asReadonly();
  readonly partnerHelpError = this._partnerHelpError.asReadonly();
  readonly completionSummary = this._completionSummary.asReadonly();
  readonly loadingCompletion = this._loadingCompletion.asReadonly();
  readonly completionError = this._completionError.asReadonly();

  readonly activeQuestion = computed<RecipientQuestionView | null>(() => {
    const questionId = this._activeQuestionId();
    if (!questionId) {
      return null;
    }
    return this._publicMeta()?.questions.find((q) => q.questionId === questionId) ?? null;
  });

  readonly activePiece = computed<PieceProgress | null>(() => {
    const questionId = this._activeQuestionId();
    return questionId ? this.pieceFor(questionId) : null;
  });

  readonly activePieceImageUrl = computed<string | null>(() => {
    const questionId = this._activeQuestionId();
    return questionId ? (this._pieceImages()[questionId] ?? null) : null;
  });

  /**
   * A piece reads as solved the instant `submitAnswer` or
   * `requestPartnerHelpReveal` resolves successfully, without waiting
   * for the `puzzle_progress` realtime listener to catch up —
   * `activePiece()?.status` will confirm it moments later, but the
   * modal shouldn't visibly stall on that round trip for feedback the
   * server already gave.
   */
  readonly isActiveSolved = computed(() => this.activePiece()?.status === 'unlocked' || this._lastPieceResolution() !== null);

  /**
   * `computeScore`/`isExperienceComplete` (M4 Phase 4) — the same UI-gating
   * domain rules `PuzzlePreviewFacade` reuses, run here against REAL
   * `puzzle_progress` data rather than local ephemeral state. This is
   * legitimate reuse, not a second source of truth for correctness:
   * these rules only aggregate/derive from piece state the server
   * already wrote (`status`/`earnedVia`/`pointsAwarded`), they never
   * decide whether an answer IS correct. `starRating` inside `score()`
   * stays `null` until every piece is unlocked (Business Rule baked
   * into `computeScore` itself) — no star preview before completion.
   */
  readonly score = computed<ScoreSummary>(() => computeScore(this._progress()?.pieces ?? {}));
  readonly isComplete = computed(() => isExperienceComplete(this._progress()?.pieces ?? {}));

  readonly activeQuestionClues = computed<readonly string[]>(() => {
    const questionId = this._activeQuestionId();
    return questionId ? (this._revealedClues()[questionId] ?? []) : [];
  });

  /**
   * Optimistic — gates on the domain's absolute `MAX_CLUES_PER_QUESTION`
   * bound until a real `requestClue` response narrows it down via
   * `clueNumbersRemaining` for a question authored with fewer clues.
   * The `requestClue` Cloud Function's own `NO_CLUES_REMAINING`
   * rejection is what actually enforces this — this computed only
   * decides when to show the button, never whether a request would
   * succeed.
   */
  readonly canRequestClueForActive = computed(() => {
    const piece = this.activePiece();
    const questionId = this._activeQuestionId();
    if (!piece || !questionId || piece.status !== 'locked' || piece.cluesUsed >= MAX_CLUES_PER_QUESTION) {
      return false;
    }
    const remaining = this._clueNumbersRemaining()[questionId];
    return remaining === undefined || remaining > 0;
  });

  /**
   * Reuses `canRequestPartnerHelp` (M4 Phase 6) — the exact rule the
   * `requestPartnerHelpReveal` Cloud Function itself enforces — rather
   * than reinventing the "clues exhausted" check. It needs the
   * question's true authored clue count, which this client only learns
   * once `clueNumbersRemaining` comes back from a `requestClue`
   * response (`cluesUsed + remaining`); before that's known, this falls
   * back to the server's own `partnerHelpAvailable` verdict already
   * attached to the last incorrect `submitAnswer` response — still
   * authoritative, just possibly one action stale, never a guess.
   */
  readonly canRequestPartnerHelpForActive = computed(() => {
    const piece = this.activePiece();
    const questionId = this._activeQuestionId();
    if (!piece || !questionId) {
      return false;
    }
    const remaining = this._clueNumbersRemaining()[questionId];
    if (remaining !== undefined) {
      return canRequestPartnerHelp(piece, piece.cluesUsed + remaining);
    }
    const outcome = this._lastSubmitOutcome();
    return outcome?.ok === true && !outcome.correct ? (outcome.partnerHelpAvailable ?? false) : false;
  });

  private progressSubscription: Subscription | null = null;

  /**
   * `getCompletionSummary` (M4 Phase 7) is fetched automatically, once,
   * the instant `isComplete()` flips true from the realtime
   * `puzzle_progress` watch — the final score/stars/message/reveal
   * image are only ever authoritative from this Cloud Function
   * (`finalRevealImageUrl` is a freshly-signed URL to the full,
   * unsliced original — nothing the client could assemble itself from
   * the 9 individual piece slices even if it wanted to).
   */
  constructor() {
    effect(
      () => {
        if (this.isComplete() && !this.completionRequested) {
          this.completionRequested = true;
          void this.loadCompletionSummary();
        }
      },
      { allowSignalWrites: true },
    );
  }

  /** Piece state for the board grid — every question id defaults to locked until `progress` (or a fresher local outcome) says otherwise. */
  pieceFor(questionId: string): PieceProgress {
    return this._progress()?.pieces[questionId] ?? lockedPiece();
  }

  /** The image for an unlocked tile, `null` while still locked or not yet cached. */
  pieceImageFor(questionId: string): string | null {
    return this._pieceImages()[questionId] ?? null;
  }

  /** Called once by the `/e/:shareToken` page on activation (component input binding), with the raw token from the URL. */
  async resolveLink(shareToken: string): Promise<void> {
    this.progressSubscription?.unsubscribe();
    this.progressSubscription = null;

    this._linkStatus.set('resolving');
    this._errorMessage.set(null);
    this._errorKind.set(null);
    this._experienceId.set(null);
    this._publicMeta.set(null);
    this._progress.set(null);
    this._pieceImages.set({});
    this._activeQuestionId.set(null);
    this._lastSubmitOutcome.set(null);
    this._answerError.set(null);
    this._revealedClues.set({});
    this._clueNumbersRemaining.set({});
    this._clueError.set(null);
    this._lastPieceResolution.set(null);
    this._partnerHelpError.set(null);
    this._completionSummary.set(null);
    this._completionError.set(null);
    this.completionRequested = false;

    try {
      const result = await this.puzzleApi.resolveShareToken(shareToken);
      if (!result.ok) {
        this._linkStatus.set('invalid');
        this._errorMessage.set(result.message);
        this._errorKind.set('invalid_link');
        return;
      }

      await this.recipientSession.signInWithCustomToken(result.customToken);

      this._experienceId.set(result.experienceId);
      this._publicMeta.set(result.publicMeta);
      this._pieceImages.set(result.unlockedPieceImages);
      this._linkStatus.set('ready');

      this.progressSubscription = this.progressRepository.watch(result.experienceId).subscribe({
        next: (progress) => this._progress.set(progress),
        error: () => this._progress.set(null),
      });
    } catch {
      this._linkStatus.set('invalid');
      this._errorMessage.set("This link isn't working right now. Please check your connection and try again.");
      this._errorKind.set('infra');
    }
  }

  /** Opens the question modal — a no-op for an already-unlocked piece, matching the board's own guard against re-opening a solved tile. */
  openQuestion(questionId: string): void {
    if (this.pieceFor(questionId).status === 'unlocked') {
      return;
    }
    this._lastSubmitOutcome.set(null);
    this._answerError.set(null);
    this._clueError.set(null);
    this._lastPieceResolution.set(null);
    this._partnerHelpError.set(null);
    this._activeQuestionId.set(questionId);
  }

  closeQuestion(): void {
    this._activeQuestionId.set(null);
    this._lastSubmitOutcome.set(null);
    this._answerError.set(null);
    this._clueError.set(null);
    this._lastPieceResolution.set(null);
    this._partnerHelpError.set(null);
  }

  /**
   * Submits an answer for the active question via the real
   * `submitAnswer` Cloud Function — never a local correctness check
   * (Module Contract §8: the Recipient client is never given a
   * `correctAnswer` to check against). `puzzle_progress`'s realtime
   * watch will independently confirm the unlock a moment later;
   * `_lastSubmitOutcome`/`isActiveSolved` just avoid visibly waiting on
   * that round trip for feedback the server already returned.
   */
  async submitAnswer(answer: string): Promise<void> {
    const questionId = this._activeQuestionId();
    if (!questionId) {
      return;
    }

    this._submitting.set(true);
    this._answerError.set(null);
    try {
      const result = await this.puzzleApi.submitAnswer(questionId, answer);
      this._lastSubmitOutcome.set(result);

      if (!result.ok) {
        this._answerError.set(result.message);
        return;
      }
      if (result.correct) {
        this._pieceImages.set({ ...this._pieceImages(), [questionId]: result.pieceImageUrl });
        this._lastPieceResolution.set({ message: result.feedbackMessage, points: result.pointsAwarded });
      }
    } catch {
      this._answerError.set("Couldn't reach the server. Check your connection and try again.");
    } finally {
      this._submitting.set(false);
    }
  }

  /**
   * Reveals the next clue for the active question via the real
   * `requestClue` Cloud Function. `cluesUsed` (the count) comes back
   * through the realtime `puzzle_progress` watch like any other
   * server-side write; only the clue TEXT is this method's own
   * responsibility to cache, since nothing else ever delivers it.
   */
  async requestClue(): Promise<void> {
    const questionId = this._activeQuestionId();
    if (!questionId || !this.canRequestClueForActive()) {
      return;
    }

    this._requestingClue.set(true);
    this._clueError.set(null);
    try {
      const result = await this.puzzleApi.requestClue(questionId);
      if (!result.ok) {
        this._clueError.set(result.message);
        return;
      }

      this._revealedClues.set({
        ...this._revealedClues(),
        [questionId]: [...(this._revealedClues()[questionId] ?? []), result.clueText],
      });
      this._clueNumbersRemaining.set({ ...this._clueNumbersRemaining(), [questionId]: result.clueNumbersRemaining });
    } catch {
      this._clueError.set("Couldn't reach the server. Check your connection and try again.");
    } finally {
      this._requestingClue.set(false);
    }
  }

  /**
   * Resolves the active piece via the "Ask Your Partner" fallback (M4
   * Phase 6) — the real `requestPartnerHelpReveal` Cloud Function,
   * which itself re-checks `canRequestPartnerHelp` server-side
   * (`CLUES_NOT_EXHAUSTED` if called too early) regardless of what this
   * client's own `canRequestPartnerHelpForActive` gate decided.
   */
  async requestPartnerHelp(): Promise<void> {
    const questionId = this._activeQuestionId();
    if (!questionId) {
      return;
    }

    this._requestingPartnerHelp.set(true);
    this._partnerHelpError.set(null);
    try {
      const result = await this.puzzleApi.requestPartnerHelpReveal(questionId);
      if (!result.ok) {
        this._partnerHelpError.set(result.message);
        return;
      }

      this._pieceImages.set({ ...this._pieceImages(), [questionId]: result.pieceImageUrl });
      this._lastPieceResolution.set({ message: result.feedbackMessage, points: result.pointsAwarded });
    } catch {
      this._partnerHelpError.set("Couldn't reach the server. Check your connection and try again.");
    } finally {
      this._requestingPartnerHelp.set(false);
    }
  }

  /**
   * Fetches the authoritative completion summary (M4 Phase 7) —
   * normally triggered automatically once (see the constructor
   * effect), but left public so the completion screen can retry after
   * `completionError` without re-deriving the auto-trigger guard.
   */
  async loadCompletionSummary(): Promise<void> {
    this._loadingCompletion.set(true);
    this._completionError.set(null);
    try {
      const result = await this.puzzleApi.getCompletionSummary();
      if (!result.ok) {
        this._completionError.set(result.message);
        return;
      }
      this._completionSummary.set(result);
    } catch {
      this._completionError.set("Couldn't reach the server. Check your connection and try again.");
    } finally {
      this._loadingCompletion.set(false);
    }
  }
}
