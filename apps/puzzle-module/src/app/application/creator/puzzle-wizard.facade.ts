import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';

import { NotAuthenticatedError } from '@domain/errors/auth-errors';
import { PuzzleExperience, draftExperience } from '@domain/models/puzzle-experience.model';
import { QuestionDefinition, emptyQuestion } from '@domain/models/question.model';
import { QUESTION_IDS } from '@domain/models/constants';
import {
  WIZARD_STEPS,
  WizardStepCompletion,
  WizardStepId,
  firstIncompleteStep,
  wizardStepCompletion,
} from '@domain/rules/wizard-progress.rules';

import { AuthFacade } from './auth.facade';
import { EXPERIENCE_REPOSITORY_PORT } from './experience.tokens';
import { STORAGE_UPLOAD_PORT } from './wizard.tokens';

const AUTOSAVE_DEBOUNCE_MS = 800;

/**
 * The Signal store every Wizard step component and the shell page
 * inject. Owns exactly one draft `PuzzleExperience` at a time —
 * there's no multi-draft editing session, so a single mutable signal
 * (not a map) is the right shape.
 *
 * Autosave: every step's `update*`/`updateQuestion` call optimistically
 * merges the change into the local `draft` signal immediately (so the
 * UI never waits on a round-trip to reflect a keystroke), then queues
 * the same change for a debounced Firestore write. Bursts of edits
 * (e.g. typing in a text field) collapse into one write 800ms after
 * the last keystroke — `switchMap` sequences the trigger stream, but
 * each `flushPendingChanges()` call runs its own write to completion
 * regardless of a later trigger superseding it in the stream, since
 * cancelling an rxjs subscription doesn't cancel an in-flight Promise.
 * Two overlapping writes to genuinely different fields don't conflict
 * (Firestore `update()` is per-field); two overlapping writes to the
 * *same* field racing is last-write-wins, which is an accepted
 * property of optimistic autosave for a single creator editing their
 * own solo draft — there is no multi-user collaborative editing here.
 */
@Injectable({ providedIn: 'root' })
export class PuzzleWizardFacade {
  private readonly experienceRepository = inject(EXPERIENCE_REPOSITORY_PORT);
  private readonly storageUpload = inject(STORAGE_UPLOAD_PORT);
  private readonly authFacade = inject(AuthFacade);

  private readonly _draft = signal<PuzzleExperience | null>(null);
  private readonly _currentStep = signal<WizardStepId>('occasion');
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _lastSavedAt = signal<Date | null>(null);
  private readonly _hasPendingChanges = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _imageUploading = signal(false);

  readonly draft = this._draft.asReadonly();
  readonly currentStep = this._currentStep.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly lastSavedAt = this._lastSavedAt.asReadonly();
  readonly hasPendingChanges = this._hasPendingChanges.asReadonly();
  readonly error = this._error.asReadonly();
  readonly imageUploading = this._imageUploading.asReadonly();

  readonly stepCompletion = computed<WizardStepCompletion | null>(() => {
    const draft = this._draft();
    return draft ? wizardStepCompletion(draft) : null;
  });

  private pendingChanges: Partial<PuzzleExperience> = {};
  private readonly autosaveTrigger = new Subject<void>();

  constructor() {
    this.autosaveTrigger
      .pipe(
        debounceTime(AUTOSAVE_DEBOUNCE_MS),
        switchMap(() => this.flushPendingChanges()),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  /** Creates and immediately persists a brand-new draft, so it exists for "resume unfinished draft" even if abandoned right after. Returns the new id to navigate to. */
  async startNewDraft(): Promise<string> {
    const creator = this.authFacade.currentCreator();
    if (!creator) {
      throw new NotAuthenticatedError();
    }

    const experienceId = crypto.randomUUID();
    const draft = draftExperience({ experienceId, creatorId: creator.creatorId, occasion: '', recipientDisplayName: '' });
    await this.experienceRepository.create(draft);

    this.resetSessionState();
    this._draft.set(draft);
    this._currentStep.set('occasion');
    this._lastSavedAt.set(new Date());
    return experienceId;
  }

  async loadDraft(experienceId: string): Promise<void> {
    this.resetSessionState();
    this._loading.set(true);
    try {
      const experience = await this.experienceRepository.getById(experienceId);
      if (!experience) {
        this._error.set('This puzzle could not be found.');
        return;
      }
      if (experience.status !== 'draft') {
        this._error.set('This puzzle has already been published and can no longer be edited here.');
        return;
      }
      this._draft.set(experience);
      this._currentStep.set(firstIncompleteStep(wizardStepCompletion(experience)));
      this._lastSavedAt.set(new Date());
    } catch {
      this._error.set('Could not load this puzzle. Please try again.');
    } finally {
      this._loading.set(false);
    }
  }

  updateOccasionEmotion(occasion: string, emotion: string): void {
    this.applyChange({ occasion, emotion });
  }

  updateRecipientDetails(recipientDisplayName: string, welcomeNote: string): void {
    this.applyChange({ recipientDisplayName, welcomeNote });
  }

  updateCompletionDetails(partnerHelpChallenge: string, completionMessage: string): void {
    this.applyChange({ partnerHelpChallenge, completionMessage });
  }

  updateQuestion(questionId: string, changes: Partial<QuestionDefinition>): void {
    const draft = this._draft();
    if (!draft) {
      return;
    }
    this.applyChange({ questions: upsertQuestion(draft.questions, questionId, changes) });
  }

  async uploadImage(file: File): Promise<boolean> {
    const draft = this._draft();
    if (!draft) {
      return false;
    }
    this._imageUploading.set(true);
    this._error.set(null);
    try {
      await this.storageUpload.uploadRevealImage(draft.creatorId, draft.experienceId, file);
      return true;
    } catch {
      this._error.set('Could not upload your photo. Please try again.');
      return false;
    } finally {
      this._imageUploading.set(false);
    }
  }

  /** Re-reads the experience — the only way to observe `revealImagePath` once the upload trigger finishes slicing server-side. */
  async refreshDraft(): Promise<void> {
    const draft = this._draft();
    if (!draft) {
      return;
    }
    const refreshed = await this.experienceRepository.getById(draft.experienceId);
    if (refreshed) {
      this._draft.set(refreshed);
    }
  }

  /**
   * Free navigation, not a hard completion gate — a creator can jump
   * between steps and fill things in out of order. The Stepper /
   * progress indicator communicate completeness; only the eventual
   * Publish action (Feature 5) is the real gate, via `canPublish()`.
   */
  async goToStep(step: WizardStepId): Promise<void> {
    await this.flushNow();
    this._currentStep.set(step);
  }

  async goNext(): Promise<void> {
    const index = WIZARD_STEPS.indexOf(this._currentStep());
    if (index < WIZARD_STEPS.length - 1) {
      await this.goToStep(WIZARD_STEPS[index + 1]);
    }
  }

  async goBack(): Promise<void> {
    const index = WIZARD_STEPS.indexOf(this._currentStep());
    if (index > 0) {
      await this.goToStep(WIZARD_STEPS[index - 1]);
    }
  }

  /** Bypasses the debounce entirely — used before step transitions/unmount so the very latest edit is never left only in memory. */
  async flushNow(): Promise<void> {
    await this.flushPendingChanges();
  }

  private applyChange(changes: Partial<PuzzleExperience>): void {
    const draft = this._draft();
    if (!draft) {
      return;
    }
    this._draft.set({ ...draft, ...changes });
    this.pendingChanges = { ...this.pendingChanges, ...changes };
    this._hasPendingChanges.set(true);
    this.autosaveTrigger.next();
  }

  private async flushPendingChanges(): Promise<void> {
    const draft = this._draft();
    if (!draft || Object.keys(this.pendingChanges).length === 0) {
      return;
    }
    const changes = this.pendingChanges;
    this.pendingChanges = {};
    this._saving.set(true);
    try {
      await this.experienceRepository.update(draft.experienceId, changes);
      this._lastSavedAt.set(new Date());
      this._hasPendingChanges.set(Object.keys(this.pendingChanges).length > 0);
    } catch {
      this._error.set('Could not save your latest changes. We’ll keep trying.');
      this.pendingChanges = { ...changes, ...this.pendingChanges };
      this.autosaveTrigger.next();
    } finally {
      this._saving.set(false);
    }
  }

  private resetSessionState(): void {
    this._draft.set(null);
    this._error.set(null);
    this._hasPendingChanges.set(false);
    this._lastSavedAt.set(null);
    this.pendingChanges = {};
  }
}

/** Keeps `questions` de-duplicated by id and sorted in canonical q1..q9 order, regardless of edit order. Exported for direct unit testing. */
export function upsertQuestion(
  questions: readonly QuestionDefinition[],
  questionId: string,
  changes: Partial<QuestionDefinition>,
): readonly QuestionDefinition[] {
  const existing = questions.find((question) => question.questionId === questionId) ?? emptyQuestion(questionId);
  const updated: QuestionDefinition = { ...existing, ...changes };
  const withoutTarget = questions.filter((question) => question.questionId !== questionId);
  return [...withoutTarget, updated].sort(
    (a, b) => QUESTION_IDS.indexOf(a.questionId) - QUESTION_IDS.indexOf(b.questionId),
  );
}
