import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { PuzzleWizardFacade } from '@application/creator/puzzle-wizard.facade';
import { QUESTION_IDS, QUESTIONS_PER_EXPERIENCE } from '@domain/models/constants';
import { validateQuestion } from '@domain/rules/lifecycle.rules';
import { ProgressBarComponent } from '@shared/progress-bar/progress-bar.component';

import { QuestionEditorComponent } from '../ui/question-editor.component';

/** Step 4 — all 9 questions, each with an answer and up to 3 optional clues, with a live "how many are ready" progress indicator. */
@Component({
  selector: 'app-questions-step',
  standalone: true,
  imports: [QuestionEditorComponent, ProgressBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './questions-step.component.html',
  styleUrl: './questions-step.component.scss',
})
export class QuestionsStepComponent {
  protected readonly wizardFacade = inject(PuzzleWizardFacade);
  protected readonly questionIds = QUESTION_IDS;
  protected readonly totalQuestions = QUESTIONS_PER_EXPERIENCE;

  protected readonly readyCount = computed(() => {
    const draft = this.wizardFacade.draft();
    return draft ? draft.questions.filter((question) => validateQuestion(question).ok).length : 0;
  });
}
