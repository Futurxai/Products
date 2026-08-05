import { ExperienceStatus } from '@domain/models/puzzle-experience.model';
import { BadgeTone } from '@shared/badge/badge.component';

/**
 * Maps a domain `ExperienceStatus` onto the generic `BadgeComponent`'s
 * tone/label vocabulary — deliberately feature-local (not `shared/`,
 * not `domain/`): `BadgeComponent` stays domain-agnostic, and this is
 * presentation logic, not a business rule.
 */
export function statusBadgeTone(status: ExperienceStatus): BadgeTone {
  switch (status) {
    case 'draft':
      return 'neutral';
    case 'published':
    case 'in_progress':
      return 'info';
    case 'completed':
      return 'success';
    case 'archived':
      return 'neutral';
  }
}

export function statusLabel(status: ExperienceStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'published':
      return 'Published';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'archived':
      return 'Archived';
  }
}
