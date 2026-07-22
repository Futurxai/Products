import { ExperienceStorePort } from '../domain/ports/experience-store.port';
import { ProgressStorePort } from '../domain/ports/progress-store.port';
import { StorageService } from '../infrastructure/storage.service';
import { isAnswerCorrect } from '../domain/rules/answer-matching.rules';
import { pointsForPiece, computeScore } from '../domain/rules/scoring.rules';
import { canRequestPartnerHelp } from '../domain/rules/lifecycle.rules';
import { feedbackTierFor, pickFeedbackMessage } from '../domain/rules/feedback.rules';
import { EarnedVia } from '../domain/models/question.model';
import { AlreadyUnlockedError, ExperienceNotFoundError, QuestionNotFoundError, RateLimitedError } from '../domain/errors/domain-errors';
import { MAX_ANSWER_ATTEMPTS_PER_QUESTION } from '../config/app-config';
import { ScopedLogger } from '../config/logger';

export interface SubmitAnswerDeps {
  experienceStore: ExperienceStorePort;
  progressStore: ProgressStorePort;
  storageService: StorageService;
  logger: ScopedLogger;
}

export interface SubmitAnswerInput {
  experienceId: string;
  questionId: string;
  answer: string;
}

export interface SubmitAnswerCorrectOutput {
  correct: true;
  questionId: string;
  cluesUsed: number;
  earnedVia: EarnedVia;
  pointsAwarded: number;
  feedbackTier: ReturnType<typeof feedbackTierFor>;
  feedbackMessage: string;
  pieceImageUrl: string;
  piecesUnlocked: number;
  piecesRemaining: number;
}

export interface SubmitAnswerIncorrectOutput {
  correct: false;
  questionId: string;
  attemptNumber: number;
  clueAvailable: boolean;
  cluesUsedSoFar: number;
  partnerHelpAvailable: boolean;
}

export type SubmitAnswerOutput = SubmitAnswerCorrectOutput | SubmitAnswerIncorrectOutput;

export async function submitAnswer(deps: SubmitAnswerDeps, input: SubmitAnswerInput): Promise<SubmitAnswerOutput> {
  const experience = await deps.experienceStore.getExperience(input.experienceId);
  if (!experience) {
    throw new ExperienceNotFoundError(input.experienceId);
  }

  const question = experience.questions.find((q) => q.questionId === input.questionId);
  if (!question) {
    throw new QuestionNotFoundError(input.questionId);
  }

  // Lazily creates the 9-locked-piece document on the very first
  // gameplay action for this experience (Module Contract §4 — no
  // progress doc exists before this moment). Idempotent: a second call
  // for an experience that already has one just returns it.
  await deps.progressStore.initializeIfAbsent(input.experienceId);

  const attemptNumber = await deps.progressStore.recordAnswerAttempt(input.experienceId, input.questionId);
  if (attemptNumber > MAX_ANSWER_ATTEMPTS_PER_QUESTION) {
    deps.logger.domainRejection('RATE_LIMITED', 'Answer attempts exceeded for question', {
      experienceId: input.experienceId,
      questionId: input.questionId,
      attemptNumber,
    });
    throw new RateLimitedError(input.questionId);
  }

  const progressBefore = await deps.progressStore.getProgress(input.experienceId);
  const pieceBefore = progressBefore!.pieces[input.questionId];

  if (pieceBefore.status === 'unlocked') {
    throw new AlreadyUnlockedError(input.questionId);
  }

  const correct = isAnswerCorrect(input.answer, question);

  if (!correct) {
    deps.logger.info('Incorrect answer submitted', {
      experienceId: input.experienceId,
      questionId: input.questionId,
      attemptNumber,
    });
    return {
      correct: false,
      questionId: input.questionId,
      attemptNumber,
      clueAvailable: pieceBefore.cluesUsed < question.clues.length,
      cluesUsedSoFar: pieceBefore.cluesUsed,
      partnerHelpAvailable: canRequestPartnerHelp(pieceBefore, question.clues.length),
    };
  }

  const earnedVia: EarnedVia = pieceBefore.cluesUsed === 0 ? 'direct' : 'clue';
  const pointsAwarded = pointsForPiece(earnedVia, pieceBefore.cluesUsed);

  const updatedProgress = await deps.progressStore.resolvePiece({
    experienceId: input.experienceId,
    questionId: input.questionId,
    earnedVia,
    cluesUsed: pieceBefore.cluesUsed,
    pointsAwarded,
  });

  const pieceImageUrl = await deps.storageService.getPieceSignedUrl(
    experience.creatorId,
    input.experienceId,
    input.questionId,
  );
  const score = computeScore(updatedProgress.pieces);
  const feedbackTier = feedbackTierFor(earnedVia);

  deps.logger.info('Piece unlocked via correct answer', {
    experienceId: input.experienceId,
    questionId: input.questionId,
    earnedVia,
    pointsAwarded,
  });

  return {
    correct: true,
    questionId: input.questionId,
    cluesUsed: pieceBefore.cluesUsed,
    earnedVia,
    pointsAwarded,
    feedbackTier,
    feedbackMessage: pickFeedbackMessage(feedbackTier),
    pieceImageUrl,
    piecesUnlocked: score.piecesUnlocked,
    piecesRemaining: score.piecesRemaining,
  };
}
