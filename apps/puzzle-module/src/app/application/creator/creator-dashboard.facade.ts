import { Injectable, computed, inject, signal } from '@angular/core';

import { PuzzleExperience } from '@domain/models/puzzle-experience.model';
import { groupExperiencesForDashboard, summarizeDashboard } from '@domain/rules/dashboard.rules';

import { AuthFacade } from './auth.facade';
import { EXPERIENCE_REPOSITORY_PORT } from './experience.tokens';

/**
 * The Signal store the Dashboard page injects. Deliberately does not
 * auto-load on construction — unlike `AuthFacade` (which must react to
 * session changes it didn't initiate), fetching a Creator's puzzles is
 * a page-driven action: the Dashboard page calls `load()` once it
 * mounts (by which point `creatorAuthGuard` has already guaranteed
 * `AuthFacade.currentCreator()` is populated).
 */
@Injectable({ providedIn: 'root' })
export class CreatorDashboardFacade {
  private readonly experienceRepository = inject(EXPERIENCE_REPOSITORY_PORT);
  private readonly authFacade = inject(AuthFacade);

  private readonly _experiences = signal<readonly PuzzleExperience[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _loaded = signal(false);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly groups = computed(() => groupExperiencesForDashboard(this._experiences()));
  readonly summary = computed(() => summarizeDashboard(this._experiences()));
  /** True once a load has actually completed with zero puzzles — never true while still loading, so the empty state can't flash before data arrives. */
  readonly isEmpty = computed(() => this._loaded() && !this._loading() && this._experiences().length === 0);

  async load(): Promise<void> {
    const creator = this.authFacade.currentCreator();
    if (!creator) {
      this._experiences.set([]);
      this._loaded.set(true);
      return;
    }

    this._loading.set(true);
    this._error.set(null);
    try {
      const experiences = await this.experienceRepository.listByCreator(creator.creatorId);
      this._experiences.set(experiences);
      this._loaded.set(true);
    } catch {
      this._error.set('Could not load your puzzles. Please try again.');
    } finally {
      this._loading.set(false);
    }
  }

  async refresh(): Promise<void> {
    await this.load();
  }
}
