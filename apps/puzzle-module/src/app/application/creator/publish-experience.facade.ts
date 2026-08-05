import { Injectable, inject, signal } from '@angular/core';

import { PuzzleExperience } from '@domain/models/puzzle-experience.model';
import { ValidationResult, canPublish } from '@domain/rules/lifecycle.rules';
import { PublishExperienceSuccess } from '@domain/ports/puzzle-api.port';

import { EXPERIENCE_REPOSITORY_PORT } from './experience.tokens';
import { PUZZLE_API_PORT } from './publish.tokens';

/** Distinguishes what kind of recovery makes sense for the Publish page's error view. */
export type PublishErrorKind = 'not_found' | 'business' | 'infra';

/**
 * The Signal store the Publish page injects (M3 Feature 5). Owns the
 * whole "click Publish" sequence: fresh-fetch the experience (so an
 * async image-slice completion since the Wizard was last open is
 * never missed), validate locally with `canPublish()` — the same
 * domain rule `functions/src/application/publish-experience.usecase.ts`
 * (M2) re-checks server-side, not a second copy of the rule — and, if
 * valid, call the real `publishExperience` Cloud Function through
 * `PuzzleApiPort`.
 *
 * Business-rule failures (`{ ok: false, ... }`) and genuine
 * infrastructure failures (a rejected promise — offline, Functions
 * unavailable, permission denied) are deliberately surfaced
 * differently: a business failure's `message` is already
 * server-authored and human-readable; an infra failure gets a generic,
 * retry-able message here, since the server never got a chance to say
 * anything.
 */
@Injectable({ providedIn: 'root' })
export class PublishExperienceFacade {
  private readonly experienceRepository = inject(EXPERIENCE_REPOSITORY_PORT);
  private readonly puzzleApi = inject(PUZZLE_API_PORT);

  private readonly _experience = signal<PuzzleExperience | null>(null);
  private readonly _loading = signal(false);
  private readonly _validation = signal<ValidationResult | null>(null);
  private readonly _publishing = signal(false);
  private readonly _publishResult = signal<PublishExperienceSuccess | null>(null);
  private readonly _error = signal<string | null>(null);
  private readonly _errorKind = signal<PublishErrorKind | null>(null);

  readonly experience = this._experience.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly validation = this._validation.asReadonly();
  readonly publishing = this._publishing.asReadonly();
  readonly publishResult = this._publishResult.asReadonly();
  readonly error = this._error.asReadonly();
  readonly errorKind = this._errorKind.asReadonly();

  /** Loads the experience, validates it, and — if valid — immediately publishes. */
  async start(experienceId: string): Promise<void> {
    this.resetState();
    this._loading.set(true);
    try {
      const experience = await this.experienceRepository.getById(experienceId);
      if (!experience) {
        this._error.set('This puzzle could not be found.');
        this._errorKind.set('not_found');
        return;
      }
      this._experience.set(experience);
      const validation = canPublish(experience);
      this._validation.set(validation);
      if (validation.ok) {
        await this.publish();
      }
    } catch {
      this._error.set('Could not load this puzzle. Please try again.');
      this._errorKind.set('infra');
    } finally {
      this._loading.set(false);
    }
  }

  /** Calls the real `publishExperience` Cloud Function. Also the retry path after an infra failure. */
  async publish(): Promise<void> {
    const experience = this._experience();
    if (!experience) {
      return;
    }
    this._publishing.set(true);
    this._error.set(null);
    this._errorKind.set(null);
    try {
      const result = await this.puzzleApi.publishExperience(experience.experienceId);
      if (result.ok) {
        this._publishResult.set(result);
      } else {
        this._error.set(result.message);
        this._errorKind.set('business');
      }
    } catch (error) {
      this._error.set(isPermissionDenied(error) ? 'You do not have permission to publish this puzzle.' : "Couldn't reach the server. Check your connection and try again.");
      this._errorKind.set('infra');
    } finally {
      this._publishing.set(false);
    }
  }

  private resetState(): void {
    this._experience.set(null);
    this._validation.set(null);
    this._publishResult.set(null);
    this._error.set(null);
    this._errorKind.set(null);
  }
}

function isPermissionDenied(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'functions/permission-denied';
}
