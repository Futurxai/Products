import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning';

/**
 * A small status pill — deliberately generic (`tone` + projected text,
 * not e.g. an `ExperienceStatus` input). Mapping a domain status to a
 * tone/label is a features/ concern (this component has no idea what a
 * "puzzle experience" is, per shared/README's own rule).
 */
@Component({
  selector: 'app-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="app-badge" [class]="'app-badge--' + tone()"><ng-content></ng-content></span>`,
  styleUrl: './badge.component.scss',
})
export class BadgeComponent {
  readonly tone = input<BadgeTone>('neutral');
}
