import { Injectable, computed, inject, signal } from '@angular/core';

import { PieceProgress } from '@domain/models/progress.model';
import { PuzzleExperience } from '@domain/models/puzzle-experience.model';
import { QuestionDefinition } from '@domain/models/question.model';
import { computeScore } from '@domain/rules/scoring.rules';
import { canRequestPartnerHelp, isExperienceComplete } from '@domain/rules/lifecycle.rules';
import {
  AnswerAttemptOutcome,
  initialPieces,
  revealNextClue,
  resolvePartnerHelp,
  submitAnswerAttempt,
} from '@domain/rules/gameplay.rules';
import { FeedbackTier } from '@domain/rules/feedback.rules';

import { EXPERIENCE_REPOSITORY_PORT } from './experience.tokens';
import { STORAGE_UPLOAD_PORT } from './wizard.tokens';

/**
 * The Signal store the Puzzle Preview page and its board/modal
 * components inject (M3 Feature 4). A Creator dry-running their own
 * draft — NOT a real Recipient session. Deliberately holds everything
 * in memory only: it never reads or writes `puzzle_progress`, never
 * calls a Cloud Function, never mints a recipient share-link session.
 * A Preview play-through must never be mistaken for real analytics or
 * leave any trace a real Recipient's progress would.
 *
 * All gameplay decisions (is this answer correct, what does it earn,
 * when does partner-help unlock) come from `domain/rules/gameplay.rules.ts`
 * — the exact same functions the eventual M5 `application/recipient/puzzle-session.facade.ts`
 * is expected to drive its Cloud-Function-backed flow from
 * conceptually. This facade is the thin, ephemeral-state half of that
 * pairing; nothing about "what a correct answer is worth" is decided
 * here a second time.
 */
@Injectable({ providedIn: 'root' })
export class PuzzlePreviewFacade {
  private readonly experienceRepository = inject(EXPERIENCE_REPOSITORY_PORT);
  private readonly storageUpload = inject(STORAGE_UPLOAD_PORT);

  private readonly _experience = signal<PuzzleExperience | null>(null);
  private readonly _pieces = signal<Readonly<Record<string, PieceProgress>>>({});
  private readonly _revealedClues = signal<Readonly<Record<string, readonly string[]>>>({});
  private readonly _activeQuestionId = signal<string | null>(null);
  private readonly _lastFeedback = signal<{ tier: FeedbackTier; message: string } | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _boardImageUrl = signal<string | null>(null);

  readonly experience = this._experience.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly boardImageUrl = this._boardImageUrl.asReadonly();
  readonly lastFeedback = this._lastFeedback.asReadonly();

  readonly score = computed(() => computeScore(this._pieces()));
  readonly isComplete = computed(() => isExperienceComplete(this._pieces()));

  readonly activeQuestion = computed<QuestionDefinition | null>(() => {
    const questionId = this._activeQuestionId();
    const experience = this._experience();
    if (!questionId || !experience) {
      return null;
    }
    return experience.questions.find((q) => q.questionId === questionId) ?? null;
  });

  readonly activePiece = computed<PieceProgress | null>(() => {
    const questionId = this._activeQuestionId();
    return questionId ? (this._pieces()[questionId] ?? null) : null;
  });

  readonly activeQuestionClues = computed<readonly string[]>(() => {
    const questionId = this._activeQuestionId();
    return questionId ? (this._revealedClues()[questionId] ?? []) : [];
  });

  readonly canRequestClueForActive = computed(() => {
    const question = this.activeQuestion();
    const piece = this.activePiece();
    if (!question || !piece) {
      return false;
    }
    return piece.status === 'locked' && piece.cluesUsed < question.clues.length;
  });

  readonly canRequestPartnerHelpForActive = computed(() => {
    const question = this.activeQuestion();
    const piece = this.activePiece();
    if (!question || !piece) {
      return false;
    }
    return canRequestPartnerHelp(piece, question.clues.length);
  });

  /** Piece state for the board grid — every question id, locked or unlocked. */
  pieceFor(questionId: string): PieceProgress {
    return this._pieces()[questionId] ?? { status: 'locked', earnedVia: null, cluesUsed: 0, pointsAwarded: 0 };
  }

  async start(experienceId: string): Promise<void> {
    this.resetSessionState();
    this._loading.set(true);
    try {
      const experience = await this.experienceRepository.getById(experienceId);
      if (!experience) {
        this._error.set('This puzzle could not be found.');
        return;
      }
      this._experience.set(experience);
      this._pieces.set(initialPieces());
      await this.loadBoardImage(experience);
    } catch {
      this._error.set('Could not load this puzzle. Please try again.');
    } finally {
      this._loading.set(false);
    }
  }

  openQuestion(questionId: string): void {
    const piece = this._pieces()[questionId];
    if (!piece || piece.status === 'unlocked') {
      return;
    }
    this._lastFeedback.set(null);
    this._activeQuestionId.set(questionId);
  }

  closeQuestion(): void {
    this._activeQuestionId.set(null);
    this._lastFeedback.set(null);
  }

  submitAnswer(answer: string): AnswerAttemptOutcome | null {
    const question = this.activeQuestion();
    const piece = this.activePiece();
    const questionId = this._activeQuestionId();
    if (!question || !piece || !questionId) {
      return null;
    }

    const outcome = submitAnswerAttempt(question, piece, answer);
    if (outcome.correct) {
      this.setPiece(questionId, outcome.piece);
      this._lastFeedback.set({ tier: outcome.feedbackTier, message: outcome.feedbackMessage });
    }
    return outcome;
  }

  requestClue(): void {
    const question = this.activeQuestion();
    const piece = this.activePiece();
    const questionId = this._activeQuestionId();
    if (!question || !piece || !questionId) {
      return;
    }

    const outcome = revealNextClue(question, piece);
    this.setPiece(questionId, outcome.piece);
    this._revealedClues.set({
      ...this._revealedClues(),
      [questionId]: [...(this._revealedClues()[questionId] ?? []), outcome.clueText],
    });
  }

  requestPartnerHelp(): void {
    const question = this.activeQuestion();
    const piece = this.activePiece();
    const questionId = this._activeQuestionId();
    if (!question || !piece || !questionId) {
      return;
    }

    const outcome = resolvePartnerHelp(question, piece);
    this.setPiece(questionId, outcome.piece);
    this._lastFeedback.set({ tier: outcome.feedbackTier, message: outcome.feedbackMessage });
  }

  /** Restarts the play-through against the same loaded experience — doesn't re-fetch anything. */
  restart(): void {
    this._pieces.set(initialPieces());
    this._revealedClues.set({});
    this._activeQuestionId.set(null);
    this._lastFeedback.set(null);
  }

  private setPiece(questionId: string, piece: PieceProgress): void {
    this._pieces.set({ ...this._pieces(), [questionId]: piece });
  }

  private async loadBoardImage(experience: PuzzleExperience): Promise<void> {
    try {
      const blob = await this.storageUpload.getRevealImageOriginalBlob(experience.creatorId, experience.experienceId);
      this.revokeBoardImageUrl();
      this._boardImageUrl.set(blob ? URL.createObjectURL(blob) : null);
    } catch {
      this._boardImageUrl.set(null);
    }
  }

  private revokeBoardImageUrl(): void {
    const current = this._boardImageUrl();
    if (current) {
      URL.revokeObjectURL(current);
    }
  }

  private resetSessionState(): void {
    this.revokeBoardImageUrl();
    this._experience.set(null);
    this._pieces.set({});
    this._revealedClues.set({});
    this._activeQuestionId.set(null);
    this._lastFeedback.set(null);
    this._error.set(null);
    this._boardImageUrl.set(null);
  }
}
