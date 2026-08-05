import { PieceProgress } from '../models/progress.model';
import { PuzzleExperience } from '../models/puzzle-experience.model';
import { QuestionDefinition } from '../models/question.model';
import { MAX_CLUES_PER_QUESTION, QUESTIONS_PER_EXPERIENCE } from '../models/constants';

export interface ValidationResult {
  readonly ok: boolean;
  readonly missingFields: readonly string[];
}

/**
 * A single question is publish-ready when it has a prompt, a correct
 * answer, and no more than the allowed number of clues (Business Rule
 * #2 caps clues at 3; 0 is allowed, per the PRD's "0–3 clues" wording).
 */
export function validateQuestion(question: QuestionDefinition): ValidationResult {
  const missingFields: string[] = [];

  if (question.prompt.trim().length === 0) {
    missingFields.push(`questions.${question.questionId}.prompt`);
  }
  if (question.correctAnswer.trim().length === 0) {
    missingFields.push(`questions.${question.questionId}.correctAnswer`);
  }
  if (question.clues.length > MAX_CLUES_PER_QUESTION) {
    missingFields.push(`questions.${question.questionId}.clues`); // over the limit, not "missing" but same reporting channel
  }

  return { ok: missingFields.length === 0, missingFields };
}

/**
 * Full publish-readiness check for an experience — mirrors the
 * `INCOMPLETE_EXPERIENCE` error shape from the `publishExperience`
 * Cloud Function contract (Phase 3, 09-cloud-function-examples.md), so
 * the wizard (client) and the Cloud Function (server, built in M2) can
 * show identical, specific error messages instead of a generic
 * "something's missing."
 */
export function canPublish(experience: PuzzleExperience): ValidationResult {
  const missingFields: string[] = [];

  if (experience.questions.length !== QUESTIONS_PER_EXPERIENCE) {
    missingFields.push('questions');
  } else {
    for (const question of experience.questions) {
      missingFields.push(...validateQuestion(question).missingFields);
    }
  }

  if (experience.revealImagePath === null) {
    missingFields.push('revealImage');
  }
  if (experience.welcomeNote.trim().length === 0) {
    missingFields.push('welcomeNote');
  }
  if (experience.completionMessage.trim().length === 0) {
    missingFields.push('completionMessage');
  }
  if (experience.partnerHelpChallenge.trim().length === 0) {
    missingFields.push('partnerHelpChallenge');
  }

  return { ok: missingFields.length === 0, missingFields };
}

/**
 * Business Rule #10: editing a published experience is blocked once
 * any Recipient progress exists, to avoid corrupting an in-progress
 * session. Drafts are always editable — they have no recipient yet.
 */
export function canEdit(experience: PuzzleExperience, hasProgress: boolean): boolean {
  if (experience.status === 'draft') {
    return true;
  }
  if (experience.status === 'published') {
    return !hasProgress;
  }
  return false; // in_progress / completed / archived are never editable
}

/** The inverse operation (published → draft) is allowed under the same condition as editing. */
export function canUnpublish(experience: PuzzleExperience, hasProgress: boolean): boolean {
  return experience.status === 'published' && !hasProgress;
}

/**
 * "Ask Your Partner" unlocks only after all of a question's clues are
 * exhausted and the piece is still unresolved (PRD Business Rule #4).
 * Shared by the Recipient UI (to show/hide the button) and the
 * `requestPartnerHelpReveal` Cloud Function (to reject a request that
 * arrives before its time) — one rule, not two copies that can drift.
 *
 * `availableClueCount` is the question's ACTUAL authored clue count
 * (0–3), not `MAX_CLUES_PER_QUESTION`. A question with only 1 authored
 * clue must unlock partner-help after that 1 clue is used, not wait
 * for a 3rd that was never written — checking against the fixed max
 * instead would strand a Recipient on any question with fewer than 3
 * authored clues.
 */
export function canRequestPartnerHelp(piece: PieceProgress, availableClueCount: number): boolean {
  return piece.status === 'locked' && piece.cluesUsed >= availableClueCount;
}

/** True once every piece in the grid has been resolved, regardless of how. */
export function isExperienceComplete(pieces: Readonly<Record<string, PieceProgress>>): boolean {
  const values = Object.values(pieces);
  return values.length === QUESTIONS_PER_EXPERIENCE && values.every((p) => p.status === 'unlocked');
}
