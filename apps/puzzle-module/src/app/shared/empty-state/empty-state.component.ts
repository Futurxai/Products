import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A "nothing here yet" block — title/subtitle plus a projected call-to-action (e.g. a `ButtonComponent`). */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-empty-state">
      <h2 class="app-empty-state__title">{{ title() }}</h2>
      @if (subtitle()) {
        <p class="app-empty-state__subtitle">{{ subtitle() }}</p>
      }
      <div class="app-empty-state__action">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
