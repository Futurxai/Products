import { ExperienceStorePort } from '../domain/ports/experience-store.port';
import { ProgressStorePort } from '../domain/ports/progress-store.port';
import { EventLogStorePort } from '../domain/ports/event-log-store.port';
import { StorageService } from '../infrastructure/storage.service';
import { canRequestPartnerHelp } from '../domain/rules/lifecycle.rules';
import { pointsForPiece, computeScore } from '../domain/rules/scoring.rules';
import { feedbackTierFor, pickFeedbackMessage } from '../domain/rules/feedback.rules';
import { CluesNotExhaustedError, ExperienceNotFoundError, QuestionNotFoundError } from '../domain/errors/domain-errors';
import { ScopedLogger } from '../config/logger';
import { logEventSafely, maybeLogPuzzleCompleted } from './analytics';

export interface RequestPartnerHelpRevealDeps {
  experienceStore: ExperienceStorePort;
  progressStore: ProgressStorePort;
  eventLogStore: EventLogStorePort;
  storageService: StorageService;
  logger: ScopedLogger;
}

export interface RequestPartnerHelpRevealInput {
  experienceId: string;
  questionId: string;
}

export interface RequestPartnerHelpRevealOutput {
  questionId: string;
  earnedVia: 'partner_help';
  pointsAwarded: number;
  feedbackTier: ReturnType<typeof feedbackTierFor>;
  feedbackMessage: string;
  pieceImageUrl: string;
  piecesUnlocked: number;
  piecesRemaining: number;
}

export async function requestPartnerHelpReveal(
  deps: RequestPartnerHelpRevealDeps,
  input: RequestPartnerHelpRevealInput,
): Promise<RequestPartnerHelpRevealOutput> {
  const experience = await deps.experienceStore.getExperience(input.experienceId);
  if (!experience) {
    throw new ExperienceNotFoundError(input.experienceId);
  }

  const question = experience.questions.find((q) => q.questionId === input.questionId);
  if (!question) {
    throw new QuestionNotFoundError(input.questionId);
  }

  await deps.progressStore.initializeIfAbsent(input.experienceId);
  const progress = await deps.progressStore.getProgress(input.experienceId);
  const piece = progress!.pieces[input.questionId];

  if (!canRequestPartnerHelp(piece, question.clues.length)) {
    deps.logger.domainRejection('CLUES_NOT_EXHAUSTED', 'Partner-help requested before clues were exhausted', {
      experienceId: input.experienceId,
      questionId: input.questionId,
      cluesUsedSoFar: piece.cluesUsed,
    });
    throw new CluesNotExhaustedError(input.questionId, piece.cluesUsed);
  }

  const pointsAwarded = pointsForPiece('partner_help', piece.cluesUsed);

  const updatedProgress = await deps.progressStore.resolvePiece({
    experienceId: input.experienceId,
    questionId: input.questionId,
    earnedVia: 'partner_help',
    cluesUsed: piece.cluesUsed,
    pointsAwarded,
  });

  const pieceImageUrl = await deps.storageService.getPieceSignedUrl(
    experience.creatorId,
    input.experienceId,
    input.questionId,
  );
  const score = computeScore(updatedProgress.pieces);
  const feedbackTier = feedbackTierFor('partner_help');

  deps.logger.info('Piece unlocked via partner-help reveal', { experienceId: input.experienceId, questionId: input.questionId });

  await logEventSafely(deps.eventLogStore, deps.logger, {
    eventName: 'partner_help.resolved',
    experienceId: input.experienceId,
    actorRole: 'recipient',
    payload: { questionId: input.questionId, pointsAwarded },
  });
  await logEventSafely(deps.eventLogStore, deps.logger, {
    eventName: 'piece.unlocked',
    experienceId: input.experienceId,
    actorRole: 'recipient',
    payload: { questionId: input.questionId, earnedVia: 'partner_help', pointsAwarded },
  });
  await maybeLogPuzzleCompleted(deps.eventLogStore, deps.logger, input.experienceId, updatedProgress);

  return {
    questionId: input.questionId,
    earnedVia: 'partner_help',
    pointsAwarded,
    feedbackTier,
    feedbackMessage: pickFeedbackMessage(feedbackTier),
    pieceImageUrl,
    piecesUnlocked: score.piecesUnlocked,
    piecesRemaining: score.piecesRemaining,
  };
}
