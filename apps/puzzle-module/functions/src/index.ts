import { initializeApp } from 'firebase-admin/app';
import { onCall } from 'firebase-functions/v2/https';

/**
 * Cloud Functions entry point — 'puzzle-module' codebase.
 *
 * Deployed into the SHARED lovedigitally-app project (see the Phase 5/6
 * architecture update: no dedicated Firebase project for this module).
 * Deployed independently of lovedigitally-web's functions via the
 * `codebase: "puzzle-module"` declaration in ../firebase.json, so
 * `firebase deploy --only functions:puzzle-module` never touches
 * publishPage / createOrder / verifyOrder / createSubscription /
 * verifySubscription / razorpayWebhook, and vice versa.
 *
 * The six real callables — publishExperience, resolveShareToken,
 * submitAnswer, requestClue, requestPartnerHelpReveal,
 * getCompletionSummary — are Milestone M2 (Firebase Infrastructure &
 * Cloud Functions). This file only proves the codebase itself deploys
 * and runs correctly, via a single health-check callable.
 */
initializeApp();

export const healthCheck = onCall({ region: 'asia-south1' }, () => {
  return {
    ok: true,
    codebase: 'puzzle-module',
    milestone: 'M0',
    timestamp: new Date().toISOString(),
  };
});
