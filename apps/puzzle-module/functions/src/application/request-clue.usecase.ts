import { ExperienceStorePort } from '../domain/ports/experience-store.port';
import { ProgressStorePort } from '../domain/ports/progress-store.port';
import { ExperienceNotFoundError, NoCluesRemainingError, QuestionNotFoundError } from '../domain/errors/domain-errors';
import { ScopedLogger } from '../config/logger';

export interface RequestClueDeps {
  experienceStore: ExperienceStorePort;
  progressStore: ProgressStorePort;
  logger: ScopedLogger;
}

export interface RequestClueInput {
  experienceId: string;
  questionId: string;
}

export interface RequestClueOutput {
  questionId: string;
  clueNumber: number;
  clueText: string;
  clueNumbersRemaining: number;
}

export async function requestClue(deps: RequestClueDeps, input: RequestClueInput): Promise<RequestClueOutput> {
  const experience = await deps.experienceStore.getExperience(input.experienceId);
  if (!experience) {
    throw new ExperienceNotFoundError(input.experienceId);
  }

  const question = experience.questions.find((q) => q.questionId === input.questionId);
  if (!question) {
    throw new QuestionNotFoundError(input.questionId);
  }

  await deps.progressStore.initializeIfAbsent(input.experienceId);

  // Atomic — bounded by how many clues THIS question actually has
  // (0–3, Business Rule #2), not the domain's upper-bound constant.
  // See the port-level doc comment for why that distinction matters.
  const clueNumber = await deps.progressStore.recordClueUsed(input.experienceId, input.questionId, question.clues.length);

  const clueText = question.clues[clueNumber - 1];
  if (clueText === undefined) {
    // Belt-and-braces: recordClueUsed's bound already prevents this,
    // but a missing clue string is a content bug, not a "clues
    // exhausted" business state — fail with the same error code from
    // the caller's point of view (no clue is available either way).
    throw new NoCluesRemainingError(input.questionId);
  }

  deps.logger.info('Clue revealed', { experienceId: input.experienceId, questionId: input.questionId, clueNumber });

  return {
    questionId: input.questionId,
    clueNumber,
    clueText,
    clueNumbersRemaining: question.clues.length - clueNumber,
  };
}
