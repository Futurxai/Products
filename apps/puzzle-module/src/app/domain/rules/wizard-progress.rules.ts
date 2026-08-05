import { ACCEPTED_IMAGE_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES, QUESTIONS_PER_EXPERIENCE } from '../models/constants';
import { PuzzleExperience } from '../models/puzzle-experience.model';
import { validateQuestion } from './lifecycle.rules';

/**
 * The Wizard's six steps, in order. Deliberately a domain concept, not
 * a UI one — each step maps 1:1 to a group of `PuzzleExperience`
 * fields that must be complete, which is exactly the kind of thing a
 * business rule (not a component) should decide.
 */
export const WIZARD_STEPS = ['occasion', 'image', 'recipient', 'questions', 'completion', 'review'] as const;
export type WizardStepId = (typeof WIZARD_STEPS)[number];

export function isOccasionStepComplete(experience: PuzzleExperience): boolean {
  return experience.occasion.trim().length > 0 && experience.emotion.trim().length > 0;
}

/**
 * Reads `revealImagePath` — set only once the `onRevealImageUploaded`
 * Cloud Function trigger (M2) finishes slicing, not the moment the
 * client's upload to Storage succeeds. `PuzzleWizardFacade` tracks the
 * upload itself separately (so the creator gets immediate feedback
 * their photo was accepted) and doesn't block wizard navigation on
 * this stricter, server-confirmed check — but this is the one that
 * matters for `canPublish` (`lifecycle.rules.ts`), later.
 */
export function isImageStepComplete(experience: PuzzleExperience): boolean {
  return experience.revealImagePath !== null;
}

export function isRecipientStepComplete(experience: PuzzleExperience): boolean {
  return experience.recipientDisplayName.trim().length > 0 && experience.welcomeNote.trim().length > 0;
}

export function isQuestionsStepComplete(experience: PuzzleExperience): boolean {
  return (
    experience.questions.length === QUESTIONS_PER_EXPERIENCE &&
    experience.questions.every((question) => validateQuestion(question).ok)
  );
}

export function isCompletionStepComplete(experience: PuzzleExperience): boolean {
  return experience.partnerHelpChallenge.trim().length > 0 && experience.completionMessage.trim().length > 0;
}

/** The review step has nothing of its own to complete — it's done once everything before it is. */
export function isReviewStepComplete(experience: PuzzleExperience): boolean {
  return (
    isOccasionStepComplete(experience) &&
    isImageStepComplete(experience) &&
    isRecipientStepComplete(experience) &&
    isQuestionsStepComplete(experience) &&
    isCompletionStepComplete(experience)
  );
}

export type WizardStepCompletion = Readonly<Record<WizardStepId, boolean>>;

/** Drives the Stepper's per-step checkmarks and the "how many pieces are ready" progress indicator (Step 4). */
export function wizardStepCompletion(experience: PuzzleExperience): WizardStepCompletion {
  return {
    occasion: isOccasionStepComplete(experience),
    image: isImageStepComplete(experience),
    recipient: isRecipientStepComplete(experience),
    questions: isQuestionsStepComplete(experience),
    completion: isCompletionStepComplete(experience),
    review: isReviewStepComplete(experience),
  };
}

/** Where a resumed draft should reopen — the first step that isn't done yet, or `'review'` if everything already is. */
export function firstIncompleteStep(completion: WizardStepCompletion): WizardStepId {
  for (const step of WIZARD_STEPS) {
    if (!completion[step]) {
      return step;
    }
  }
  return 'review';
}

export interface ImageFileDescriptor {
  readonly sizeBytes: number;
  readonly mimeType: string;
}

export interface ImageValidationResult {
  readonly ok: boolean;
  readonly error: 'too_large' | 'unsupported_type' | null;
}

/**
 * Deliberately takes a plain descriptor, not a browser `File` — domain/
 * stays platform-agnostic (no DOM lib dependency), and this is exactly
 * as testable either way since only `size`/`type` are ever read.
 */
export function validateImageFile(file: ImageFileDescriptor): ImageValidationResult {
  // Strict less-than, matching Storage Rules' `request.resource.size < 10 * 1024 * 1024` exactly —
  // a file of precisely 10MB is rejected server-side, so accepting it here would let a creator
  // upload successfully past client-side validation only to have the real Storage write fail.
  if (file.sizeBytes >= MAX_IMAGE_UPLOAD_BYTES) {
    return { ok: false, error: 'too_large' };
  }
  if (!ACCEPTED_IMAGE_MIME_TYPES.includes(file.mimeType)) {
    return { ok: false, error: 'unsupported_type' };
  }
  return { ok: true, error: null };
}
