import { initializeApp } from 'firebase-admin/app';
import { onCall } from 'firebase-functions/v2/https';

/**
 * Cloud Functions entry point — 'puzzle-module' codebase, deployed into
 * the SHARED lovedigitally-app project (see ../firebase.json and the
 * Phase 5/6 architecture update). Independent of lovedigitally-web's
 * functions via the `codebase: "puzzle-module"` declaration.
 */
initializeApp();

export const healthCheck = onCall({ region: 'asia-south1' }, () => {
  return {
    ok: true,
    codebase: 'puzzle-module',
    milestone: 'M2',
    timestamp: new Date().toISOString(),
  };
});

export { publishExperienceCallable as publishExperience } from './callable/publish-experience.callable';
export { resolveShareTokenCallable as resolveShareToken } from './callable/resolve-share-token.callable';
export { submitAnswerCallable as submitAnswer } from './callable/submit-answer.callable';
export { requestClueCallable as requestClue } from './callable/request-clue.callable';
export { requestPartnerHelpRevealCallable as requestPartnerHelpReveal } from './callable/request-partner-help-reveal.callable';
export { getCompletionSummaryCallable as getCompletionSummary } from './callable/get-completion-summary.callable';

export { onRevealImageUploaded } from './triggers/on-reveal-image-uploaded.trigger';
