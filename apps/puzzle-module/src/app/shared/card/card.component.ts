import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A plain elevated surface — no domain knowledge, no logic, just the
 * app's card visual language (radius, shadow, padding scale) in one
 * place instead of repeated in every feature page's own stylesheet.
 */
@Component({
  selector: 'app-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  styleUrl: './card.component.scss',
  host: {
    class: 'app-card',
    '[class.app-card--flush]': '!padded()',
  },
})
export class CardComponent {
  /** Set `false` to remove the default inner padding — useful when a child (e.g. a full-bleed image) needs to own its own edges. */
  readonly padded = input(true);
}
