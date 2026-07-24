import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

import { DomainErrorCode } from '@domain/errors/domain-errors';
import {
  CompletionSummaryResult,
  PublishExperienceResult,
  PuzzleApiPort,
  RecipientLoggableEventName,
  RequestClueResult,
  RequestPartnerHelpRevealResult,
  ResolveShareTokenResult,
  SubmitAnswerResult,
} from '@domain/ports/puzzle-api.port';

/**
 * `PuzzleApiPort` implemented against the six real Cloud Functions
 * built in M2 (`functions/src/callable/*.ts`). This is the only place
 * in the app that calls `httpsCallable` — every method maps the raw
 * wire response into the port's declared shape explicitly, field by
 * field, rather than trusting `response.data as X`: the Cloud
 * Functions' own usecase outputs use `questionId` (their internal
 * name), while this port's client-facing types use `questionIndex`
 * (the Phase 3 API contract's name) — a deliberate naming difference
 * between "what the server computes with" and "what the client API
 * exposes," not a bug, but one that means a blind cast would silently
 * produce an object shaped wrong for anything reading `questionIndex`.
 *
 * Business-rule failures come back as `{ ok: false, ... }` — matching
 * `ApiFailure` — and are returned as-is, never thrown. Genuine
 * infrastructure failures (offline, `functions/unavailable`,
 * `functions/permission-denied`, a malformed request rejected before
 * it ever reaches a use-case) reject the call and are left to
 * propagate here, exactly mirroring `functions/src/callable/define-callable.ts`'s
 * own "business failures resolve, everything else rejects" split —
 * `PublishExperienceFacade` (M3 Feature 5) is what catches those and
 * turns them into a retry-able UI message.
 *
 * Only `publishExperience` is exercised by any feature built so far
 * (M3 Feature 5). The other five exist to satisfy this already-declared
 * port in full — `application/recipient/puzzle-session.facade.ts` (M5)
 * is their eventual real caller.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseFunctionsPuzzleApiService implements PuzzleApiPort {
  private readonly functions = inject(Functions);

  // Held as an overridable instance property, not called inline —
  // `@angular/fire/functions`'s `httpsCallable` is a frozen ESM export
  // and can't be `spyOn`'d directly; tests replace this one property
  // instead of standing up the whole SDK (same pattern as
  // `storage-upload.service.ts`'s `fetchBlob`).
  //
  // `timeout: 20000` (M5 Phase 5, error recovery) — Firebase's own
  // default is 70 seconds, which for a gameplay action the Recipient is
  // actively watching a spinner for is far too long to leave someone
  // wondering whether anything is happening before the generic "couldn't
  // reach the server" message ever appears. 20s is still generous for a
  // slow mobile connection hitting a Firestore-transaction-backed
  // callable, just not silent-for-a-minute generous.
  private callFunction = <TRequest, TResponse>(name: string, payload: TRequest): Promise<TResponse> =>
    httpsCallable<TRequest, TResponse>(this.functions, name, { timeout: 20000 })(payload).then((response) => response.data);

  async publishExperience(experienceId: string): Promise<PublishExperienceResult> {
    return this.callFunction<{ experienceId: string }, PublishExperienceResult>('publishExperience', { experienceId });
  }

  async resolveShareToken(shareToken: string): Promise<ResolveShareTokenResult> {
    return this.callFunction<{ shareToken: string }, ResolveShareTokenResult>('resolveShareToken', { shareToken });
  }

  async submitAnswer(questionIndex: string, answer: string): Promise<SubmitAnswerResult> {
    const data = await this.callFunction<{ questionIndex: string; answer: string }, RawSubmitAnswerResponse>('submitAnswer', {
      questionIndex,
      answer,
    });
    if (!data.ok) {
      return data;
    }
    if (!data.correct) {
      return {
        ok: true,
        correct: false,
        questionIndex: data.questionId,
        attemptNumber: data.attemptNumber,
        clueAvailable: data.clueAvailable,
        cluesUsedSoFar: data.cluesUsedSoFar,
        partnerHelpAvailable: data.partnerHelpAvailable,
      };
    }
    return {
      ok: true,
      correct: true,
      questionIndex: data.questionId,
      cluesUsed: data.cluesUsed,
      earnedVia: data.earnedVia,
      pointsAwarded: data.pointsAwarded,
      feedbackTier: data.feedbackTier,
      feedbackMessage: data.feedbackMessage,
      pieceImageUrl: data.pieceImageUrl,
      piecesUnlocked: data.piecesUnlocked,
      piecesRemaining: data.piecesRemaining,
    };
  }

  async requestClue(questionIndex: string): Promise<RequestClueResult> {
    const data = await this.callFunction<{ questionIndex: string }, RawRequestClueResponse>('requestClue', { questionIndex });
    if (!data.ok) {
      return data;
    }
    return { ok: true, questionIndex: data.questionId, clueNumber: data.clueNumber, clueText: data.clueText, clueNumbersRemaining: data.clueNumbersRemaining };
  }

  async requestPartnerHelpReveal(questionIndex: string): Promise<RequestPartnerHelpRevealResult> {
    const data = await this.callFunction<{ questionIndex: string }, RawRequestPartnerHelpRevealResponse>('requestPartnerHelpReveal', {
      questionIndex,
    });
    if (!data.ok) {
      return data;
    }
    return {
      ok: true,
      questionIndex: data.questionId,
      earnedVia: data.earnedVia,
      pointsAwarded: data.pointsAwarded,
      feedbackTier: data.feedbackTier,
      feedbackMessage: data.feedbackMessage,
      pieceImageUrl: data.pieceImageUrl,
      piecesUnlocked: data.piecesUnlocked,
      piecesRemaining: data.piecesRemaining,
    };
  }

  async logRecipientEvent(eventName: RecipientLoggableEventName): Promise<void> {
    await this.callFunction<{ eventName: RecipientLoggableEventName }, Record<string, never>>('logRecipientEvent', { eventName });
  }

  async getCompletionSummary(): Promise<CompletionSummaryResult> {
    const data = await this.callFunction<Record<string, never>, RawGetCompletionSummaryResponse>('getCompletionSummary', {});
    if (!data.ok) {
      return data;
    }
    return {
      ok: true,
      finalScore: data.finalScore,
      maxScore: data.maxScore,
      starRating: data.starRating,
      starLabel: data.starLabel,
      completionMessage: data.completionMessage,
      finalRevealImageUrl: data.finalRevealImageUrl,
      perQuestionBreakdown: data.perQuestionBreakdown.map((entry) => ({
        questionIndex: entry.questionId,
        earnedVia: entry.earnedVia,
        pointsAwarded: entry.pointsAwarded,
      })),
    };
  }
}

/**
 * Raw wire shapes — matching the actual `*.usecase.ts` output field
 * names (`questionId`), not the port's client-facing `questionIndex`.
 * Kept file-local: nothing outside this adapter should ever see these.
 */
type RawSubmitAnswerResponse =
  | { ok: false; error: DomainErrorCode; message: string; details?: Readonly<Record<string, unknown>> }
  | {
      ok: true;
      correct: true;
      questionId: string;
      cluesUsed: number;
      earnedVia: 'direct' | 'clue' | 'partner_help';
      pointsAwarded: number;
      feedbackTier: 'youre_awesome' | 'nudge_to_remember' | 'teasing_inside_jokes';
      feedbackMessage: string;
      pieceImageUrl: string;
      piecesUnlocked: number;
      piecesRemaining: number;
    }
  | { ok: true; correct: false; questionId: string; attemptNumber: number; clueAvailable: boolean; cluesUsedSoFar: number; partnerHelpAvailable?: boolean };

type RawRequestClueResponse =
  | { ok: false; error: DomainErrorCode; message: string; details?: Readonly<Record<string, unknown>> }
  | { ok: true; questionId: string; clueNumber: number; clueText: string; clueNumbersRemaining: number };

type RawRequestPartnerHelpRevealResponse =
  | { ok: false; error: DomainErrorCode; message: string; details?: Readonly<Record<string, unknown>> }
  | { ok: true; questionId: string; earnedVia: 'partner_help'; pointsAwarded: number; feedbackTier: 'teasing_inside_jokes'; feedbackMessage: string; pieceImageUrl: string; piecesUnlocked: number; piecesRemaining: number };

type RawGetCompletionSummaryResponse =
  | { ok: false; error: DomainErrorCode; message: string; details?: Readonly<Record<string, unknown>> }
  | {
      ok: true;
      finalScore: number;
      maxScore: number;
      starRating: 1 | 2 | 3;
      starLabel: string;
      completionMessage: string;
      finalRevealImageUrl: string;
      perQuestionBreakdown: ReadonlyArray<{ questionId: string; earnedVia: 'direct' | 'clue' | 'partner_help'; pointsAwarded: number }>;
    };
