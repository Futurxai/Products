import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { PuzzleExperience } from '@domain/models/puzzle-experience.model';
import { BadgeComponent, BadgeTone } from '@shared/badge/badge.component';
import { CardComponent } from '@shared/card/card.component';

import { statusBadgeTone, statusLabel } from './status-badge.util';

/**
 * A single Dashboard list item. Draft cards are clickable — they resume
 * editing in the Wizard (Feature 3). Published/completed/archived cards
 * stay non-interactive: there's no Preview or detail destination for
 * them yet (Features 4-5), and a dead-end click would be worse than no
 * click at all.
 */
@Component({
  selector: 'app-experience-card',
  standalone: true,
  imports: [NgTemplateOutlet, CardComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isDraft()) {
      <button type="button" class="experience-card__trigger" (click)="resumeDraft()">
        <ng-container [ngTemplateOutlet]="cardContent"></ng-container>
      </button>
    } @else {
      <ng-container [ngTemplateOutlet]="cardContent"></ng-container>
    }

    <ng-template #cardContent>
      <app-card class="experience-card">
        <div class="experience-card__header">
          <span class="experience-card__occasion">{{ experience().occasion }}</span>
          <app-badge [tone]="tone()">{{ label() }}</app-badge>
        </div>
        <p class="experience-card__recipient">For {{ experience().recipientDisplayName }}</p>
        <p class="experience-card__date">{{ dateLabel() }}</p>
      </app-card>
    </ng-template>
  `,
  styleUrl: './experience-card.component.scss',
})
export class ExperienceCardComponent {
  private readonly router = inject(Router);

  readonly experience = input.required<PuzzleExperience>();

  protected readonly isDraft = computed(() => this.experience().status === 'draft');
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

  protected async resumeDraft(): Promise<void> {
    await this.router.navigate(['/creator/wizard', this.experience().experienceId]);
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}
