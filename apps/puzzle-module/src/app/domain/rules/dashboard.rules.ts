import { PuzzleExperience } from '../models/puzzle-experience.model';

/**
 * How the Creator Dashboard buckets a flat experience list into
 * sections. `published` deliberately covers both `'published'` and
 * `'in_progress'` — from the Creator's point of view both mean "this
 * is live and shared," the distinction between "waiting to be opened"
 * and "being played right now" isn't a grouping a dashboard overview
 * needs to make. `archived` experiences are excluded entirely — the
 * Feature 2 dashboard has no archive view; nothing else in this
 * module reads `archived` docs yet either.
 */
export interface DashboardGroups {
  readonly drafts: readonly PuzzleExperience[];
  readonly published: readonly PuzzleExperience[];
  readonly completed: readonly PuzzleExperience[];
}

export function groupExperiencesForDashboard(experiences: readonly PuzzleExperience[]): DashboardGroups {
  const drafts: PuzzleExperience[] = [];
  const published: PuzzleExperience[] = [];
  const completed: PuzzleExperience[] = [];

  for (const experience of experiences) {
    switch (experience.status) {
      case 'draft':
        drafts.push(experience);
        break;
      case 'published':
      case 'in_progress':
        published.push(experience);
        break;
      case 'completed':
        completed.push(experience);
        break;
      case 'archived':
        break;
    }
  }

  return { drafts, published, completed };
}

export interface DashboardSummary {
  readonly totalCount: number;
  readonly draftCount: number;
  readonly publishedCount: number;
  readonly completedCount: number;
}

/**
 * Aggregate counts only — no per-recipient play/score data. That would
 * mean cross-referencing `puzzle_progress` for every experience, a
 * meaningfully bigger read (and a genuinely different feature, an
 * Insights/Analytics view) than "how many puzzles do I have in each
 * state," which is all a dashboard overview needs.
 */
export function summarizeDashboard(experiences: readonly PuzzleExperience[]): DashboardSummary {
  const { drafts, published, completed } = groupExperiencesForDashboard(experiences);
  return {
    totalCount: drafts.length + published.length + completed.length,
    draftCount: drafts.length,
    publishedCount: published.length,
    completedCount: completed.length,
  };
}
