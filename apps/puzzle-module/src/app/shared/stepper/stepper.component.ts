import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface StepperStep {
  readonly id: string;
  readonly label: string;
}

/**
 * A generic step indicator — takes plain `{id, label}` steps and a set
 * of completed ids, not a `WizardStepId`. Real `<button>` elements
 * (not clickable `<div>`s) so keyboard/focus/activation come for free;
 * `role="tablist"`/`aria-selected`/`aria-current` follow the standard
 * tab-panel accessibility pattern (WCAG 2.1 AA operable-by-keyboard).
 */
@Component({
  selector: 'app-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="app-stepper" role="tablist" aria-label="Wizard steps">
      @for (step of steps(); track step.id; let i = $index) {
        <li class="app-stepper__item" role="presentation">
          <button
            type="button"
            role="tab"
            class="app-stepper__button"
            [class.app-stepper__button--current]="step.id === currentStepId()"
            [class.app-stepper__button--complete]="completedStepIds().has(step.id)"
            [attr.aria-selected]="step.id === currentStepId()"
            [attr.aria-current]="step.id === currentStepId() ? 'step' : null"
            (click)="stepSelected.emit(step.id)"
          >
            <span class="app-stepper__index" aria-hidden="true">
              @if (completedStepIds().has(step.id) && step.id !== currentStepId()) {
                &#10003;
              } @else {
                {{ i + 1 }}
              }
            </span>
            <span class="app-stepper__label">{{ step.label }}</span>
          </button>
        </li>
      }
    </ol>
  `,
  styleUrl: './stepper.component.scss',
})
export class StepperComponent {
  readonly steps = input.required<readonly StepperStep[]>();
  readonly currentStepId = input.required<string>();
  readonly completedStepIds = input<ReadonlySet<string>>(new Set());
  readonly stepSelected = output<string>();
}
