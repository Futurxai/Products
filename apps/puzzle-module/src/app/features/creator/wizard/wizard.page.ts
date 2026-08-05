import { Component, HostListener, OnInit, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

import { PuzzleWizardFacade } from '@application/creator/puzzle-wizard.facade';
import { WIZARD_STEPS, WizardStepId } from '@domain/rules/wizard-progress.rules';
import { ButtonComponent } from '@shared/button/button.component';
import { LoaderComponent } from '@shared/loader/loader.component';
import { StepperComponent, StepperStep } from '@shared/stepper/stepper.component';
import { ToastService } from '@shared/toast/toast.service';

import { WizardDeactivationAware } from '../../../core/guards/wizard-unsaved-changes.guard';
import { CompletionDetailsStepComponent } from './steps/completion-details-step.component';
import { ImageUploadStepComponent } from './steps/image-upload-step.component';
import { OccasionEmotionStepComponent } from './steps/occasion-emotion-step.component';
import { QuestionsStepComponent } from './steps/questions-step.component';
import { RecipientDetailsStepComponent } from './steps/recipient-details-step.component';
import { ReviewStepComponent } from './steps/review-step.component';

const STEP_LABELS: Readonly<Record<WizardStepId, string>> = {
  occasion: 'Occasion',
  image: 'Photo',
  recipient: 'Recipient',
  questions: 'Questions',
  completion: 'Completion',
  review: 'Review',
};

/**
 * The Wizard shell: resolves which draft to edit (`:experienceId` is
 * either a real id to resume, or the sentinel `'new'` to start one),
 * renders the Stepper + autosave status, and swaps between the six
 * step components based on `PuzzleWizardFacade.currentStep()`. Each
 * step component injects `PuzzleWizardFacade` directly (the same
 * pattern every other feature page uses for its facade) rather than
 * receiving the draft via `@Input` — there's exactly one facade
 * instance for the whole wizard session, so passing it down would just
 * be ceremony.
 */
@Component({
  selector: 'app-wizard-page',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    ButtonComponent,
    LoaderComponent,
    StepperComponent,
    OccasionEmotionStepComponent,
    ImageUploadStepComponent,
    RecipientDetailsStepComponent,
    QuestionsStepComponent,
    CompletionDetailsStepComponent,
    ReviewStepComponent,
  ],
  templateUrl: './wizard.page.html',
  styleUrl: './wizard.page.scss',
})
export class WizardPage implements OnInit, WizardDeactivationAware {
  protected readonly wizardFacade = inject(PuzzleWizardFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly stepperSteps: readonly StepperStep[] = WIZARD_STEPS.map((id) => ({ id, label: STEP_LABELS[id] }));

  protected readonly completedStepIds = computed<ReadonlySet<string>>(() => {
    const completion = this.wizardFacade.stepCompletion();
    return completion ? new Set(WIZARD_STEPS.filter((id) => completion[id])) : new Set<string>();
  });

  protected readonly autosaveStatus = computed(() => {
    if (this.wizardFacade.saving()) {
      return 'Saving…';
    }
    if (this.wizardFacade.hasPendingChanges()) {
      return 'Unsaved changes';
    }
    if (this.wizardFacade.lastSavedAt()) {
      return 'Saved';
    }
    return '';
  });

  async ngOnInit(): Promise<void> {
    const experienceId = this.route.snapshot.paramMap.get('experienceId');
    if (!experienceId) {
      await this.router.navigateByUrl('/creator');
      return;
    }

    if (experienceId === 'new') {
      try {
        const newId = await this.wizardFacade.startNewDraft();
        await this.router.navigate(['/creator/wizard', newId], { replaceUrl: true });
      } catch {
        this.toast.error('Could not start a new puzzle. Please try again.');
        await this.router.navigateByUrl('/creator');
      }
    } else {
      await this.wizardFacade.loadDraft(experienceId);
    }
  }

  /** Implements `WizardDeactivationAware` — read by `wizardUnsavedChangesGuard` on in-app navigation away. */
  hasUnsavedChanges(): boolean {
    return this.wizardFacade.hasPendingChanges();
  }

  /** The other half of unsaved-change protection — actual tab close/refresh, which Angular Router guards never see. */
  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.wizardFacade.hasPendingChanges()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  protected readonly isFirstStep = computed(() => this.wizardFacade.currentStep() === WIZARD_STEPS[0]);
  protected readonly isReviewStep = computed(() => this.wizardFacade.currentStep() === 'review');

  protected onStepSelected(stepId: string): void {
    void this.wizardFacade.goToStep(stepId as WizardStepId);
  }

  protected goBack(): void {
    void this.wizardFacade.goBack();
  }

  protected goNext(): void {
    void this.wizardFacade.goNext();
  }
}
