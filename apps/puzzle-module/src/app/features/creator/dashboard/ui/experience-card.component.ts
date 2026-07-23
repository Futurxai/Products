import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PuzzleExperience } from '@domain/models/puzzle-experience.model';
import { BadgeComponent, BadgeTone } from '@shared/badge/badge.component';
import { CardComponent } from '@shared/card/card.component';

import { statusBadgeTone, statusLabel } from './status-badge.util';

/**
 * A single Dashboard list item. Deliberately non-interactive (no click
 * handler) — there is nothing to navigate to yet: editing a draft or
 * viewing a published puzzle's detail both belong to the Wizard
 * (Feature 3), not built here. Adding a click handler now would either
 * dead-end or need a throwaway placeholder route, neither of which
 * belongs in this feature.
 */
@Component({
  selector: 'app-experience-card',
  standalone: true,
  imports: [CardComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-card class="experience-card">
      <div class="experience-card__header">
        <span class="experience-card__occasion">{{ experience().occasion }}</span>
        <app-badge [tone]="tone()">{{ label() }}</app-badge>
      </div>
      <p class="experience-card__recipient">For {{ experience().recipientDisplayName }}</p>
      <p class="experience-card__date">{{ dateLabel() }}</p>
    </app-card>
  `,
  styleUrl: './experience-card.component.scss',
})
export class ExperienceCardComponent {
  readonly experience = input.required<PuzzleExperience>();

  protected readonly tone = computed<BadgeTone>(() => statusBadgeTone(this.experience().status));
  protected readonly label = computed(() => statusLabel(this.experience().status));
  protected readonly dateLabel = computed(() => {
    const exp = this.experience();
    if (exp.completedAt) {
      return `Completed ${formatDate(exp.completedAt)}`;
    }
    if (exp.publishedAt) {
      return `Published ${formatDate(exp.publishedAt)}`;
    }
    return `Created ${formatDate(exp.createdAt)}`;
  });
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}
