import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { IonSelect, IonSelectOption } from '@ionic/angular/standalone';

import { PuzzleWizardFacade } from '@application/creator/puzzle-wizard.facade';
import { EMOTIONS, OCCASIONS } from '@domain/models/constants';

/** Step 1 — occasion + emotion selection, autosaved on every change. */
@Component({
  selector: 'app-occasion-emotion-step',
  standalone: true,
  imports: [IonSelect, IonSelectOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './occasion-emotion-step.component.html',
  styleUrl: './occasion-emotion-step.component.scss',
})
export class OccasionEmotionStepComponent {
  protected readonly wizardFacade = inject(PuzzleWizardFacade);
  protected readonly occasions = OCCASIONS;
  protected readonly emotions = EMOTIONS;

  protected readonly touched = signal(false);

  protected get occasionError(): string | null {
    if (!this.touched() || this.wizardFacade.draft()?.occasion) {
      return null;
    }
    return 'Please select an occasion.';
  }

  protected get emotionError(): string | null {
    if (!this.touched() || this.wizardFacade.draft()?.emotion) {
      return null;
    }
    return 'Please select an emotion.';
  }

  protected onOccasionChange(event: CustomEvent<{ value?: string | null }>): void {
    this.touched.set(true);
    const value = event.detail.value ?? '';
    this.wizardFacade.updateOccasionEmotion(value, this.wizardFacade.draft()?.emotion ?? '');
  }

  protected onEmotionChange(event: CustomEvent<{ value?: string | null }>): void {
    this.touched.set(true);
    const value = event.detail.value ?? '';
    this.wizardFacade.updateOccasionEmotion(this.wizardFacade.draft()?.occasion ?? '', value);
  }
}
