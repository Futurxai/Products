import { ExperienceStorePort } from '../domain/ports/experience-store.port';
import { ProgressStorePort } from '../domain/ports/progress-store.port';
import { StorageService } from '../infrastructure/storage.service';
import { computeScore } from '../domain/rules/scoring.rules';
import { EarnedVia } from '../domain/models/question.model';
import { ExperienceNotFoundError, NotYetCompletedError } from '../domain/errors/domain-errors';
import { ScopedLogger } from '../config/logger';

export interface GetCompletionSummaryDeps {
  experienceStore: ExperienceStorePort;
  progressStore: ProgressStorePort;
  storageService: StorageService;
  logger: ScopedLogger;
}

export interface GetCompletionSummaryInput {
  experienceId: string;
}

export interface GetCompletionSummaryOutput {
  finalScore: number;
  maxScore: number;
  starRating: 1 | 2 | 3;
  starLabel: string;
  completionMessage: string;
  finalRevealImageUrl: string;
  perQuestionBreakdown: ReadonlyArray<{ questionId: string; earnedVia: EarnedVia; pointsAwarded: number }>;
}

const STAR_LABELS: Readonly<Record<1 | 2 | 3, string>> = {
  3: 'You know them by heart',
  2: 'You know them well',
  1: "You made it — that's what counts",
};

export async function getCompletionSummary(
  deps: GetCompletionSummaryDeps,
  input: GetCompletionSummaryInput,
): Promise<GetCompletionSummaryOutput> {
  const experience = await deps.experienceStore.getExperience(input.experienceId);
  if (!experience) {
    throw new ExperienceNotFoundError(input.experienceId);
  }

  const progress = await deps.progressStore.getProgress(input.experienceId);
  const score = computeScore(progress?.pieces ?? {});

  if (score.starRating === null) {
    throw new NotYetCompletedError(score.piecesRemaining);
  }

  const finalRevealImageUrl = await deps.storageService.getFullRevealSignedUrl(experience.creatorId, input.experienceId);

  deps.logger.info('Completion summary served', { experienceId: input.experienceId, finalScore: score.totalScore });

  return {
    finalScore: score.totalScore,
    maxScore: score.maxScore,
    starRating: score.starRating,
    starLabel: STAR_LABELS[score.starRating],
    completionMessage: experience.completionMessage,
    finalRevealImageUrl,
    perQuestionBreakdown: score.breakdown.map((entry) => ({
      questionId: entry.questionId,
      earnedVia: entry.earnedVia,
      pointsAwarded: entry.pointsAwarded,
    })),
  };
}
