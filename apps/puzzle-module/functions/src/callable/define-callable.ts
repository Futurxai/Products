import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { ZodType, z } from 'zod';
import { DomainError, isDomainError } from '../domain/errors/domain-errors';
import { createLogger } from '../config/logger';

/**
 * Shared shell for all six callables: validate -> authorize -> run ->
 * map errors -> log. Every callable below is a thin declaration built
 * on this, not six copies of the same boilerplate.
 *
 * Two different failure channels, deliberately not conflated:
 *   - Malformed request (fails Zod validation) -> REJECTS with
 *     `HttpsError('invalid-argument', ...)`. This is a transport-level
 *     problem — the caller sent something that isn't even a candidate
 *     for business-rule evaluation.
 *   - A well-formed request that violates a business rule (a thrown
 *     `DomainError`) -> RESOLVES normally with `{ ok: false, error,
 *     message, details }`, matching `domain/ports/puzzle-api.port.ts`'s
 *     `ApiFailure` shape. The client's `PuzzleApiPort` implementation
 *     (M3/M5) is written against that discriminated-union contract,
 *     not against catching rejected promises for expected outcomes
 *     like "wrong answer" or "clues not exhausted yet."
 *   - Anything else (a genuine bug, Firestore unavailable) is left to
 *     propagate as-is; Firebase turns it into an `internal` HttpsError
 *     on the wire. These are not business errors and don't get the
 *     friendly `ok:false` treatment.
 */

type CallableAuth = NonNullable<CallableRequest['auth']>;

async function runHandler<TOutput>(
  functionName: string,
  actorUid: string | undefined,
  run: () => Promise<TOutput>,
): Promise<{ ok: true } & TOutput> {
  const logger = createLogger({ functionName, actorUid });
  try {
    const result = await run();
    return { ok: true, ...result };
  } catch (error) {
    if (isDomainError(error)) {
      logger.domainRejection(error.code, error.message, error.details);
      // Re-thrown as a structured value the outer onCall handler resolves
      // with, not a rejection — see the file-level doc comment.
      throw new ResolvedDomainFailure(error);
    }
    logger.error('Unhandled error in callable handler', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/** Internal-only wrapper distinguishing "resolve with ok:false" from "let it propagate as a real rejection." */
class ResolvedDomainFailure extends Error {
  constructor(readonly domainError: DomainError) {
    super(domainError.message);
  }
}

function toResponse<TOutput>(work: Promise<{ ok: true } & TOutput>) {
  return work.catch((error) => {
    if (error instanceof ResolvedDomainFailure) {
      const { code, message, details } = error.domainError;
      return { ok: false as const, error: code, message, details };
    }
    throw error;
  });
}

/**
 * `publishExperience` — the only creator-scoped callable. Requires a
 * real (non-anonymous) authenticated user; ownership of the specific
 * experience is a business rule, checked inside the use-case
 * (`UnauthorizedError`), not here.
 */
export function defineCreatorCallable<TSchema extends ZodType, TOutput>(config: {
  functionName: string;
  schema: TSchema;
  handler: (input: z.infer<TSchema>, requesterUid: string) => Promise<TOutput>;
}) {
  return onCall({ region: 'asia-south1' }, (request: CallableRequest) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'This action requires authentication.');
    }
    const parsed = config.schema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.issues.map((i) => i.message).join('; '));
    }
    return toResponse(
      runHandler(config.functionName, request.auth.uid, () => config.handler(parsed.data, request.auth!.uid)),
    );
  });
}

/** `resolveShareToken` — the only callable requiring no auth at all; it's what MINTS the recipient's session. */
export function definePublicCallable<TSchema extends ZodType, TOutput>(config: {
  functionName: string;
  schema: TSchema;
  handler: (input: z.infer<TSchema>) => Promise<TOutput>;
}) {
  return onCall({ region: 'asia-south1' }, (request: CallableRequest) => {
    const parsed = config.schema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.issues.map((i) => i.message).join('; '));
    }
    return toResponse(runHandler(config.functionName, undefined, () => config.handler(parsed.data)));
  });
}

/**
 * The four gameplay callables (`submitAnswer`, `requestClue`,
 * `requestPartnerHelpReveal`, `getCompletionSummary`) — all scoped to
 * the anonymous session `resolveShareToken` minted, via the
 * `experienceId` custom claim. Extracting and validating that claim
 * lives here once, not four times.
 */
export function defineRecipientCallable<TSchema extends ZodType, TOutput>(config: {
  functionName: string;
  schema: TSchema;
  handler: (input: z.infer<TSchema>, experienceId: string) => Promise<TOutput>;
}) {
  return onCall({ region: 'asia-south1' }, (request: CallableRequest) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'This action requires an active recipient session.');
    }
    const experienceId = (request.auth.token as { experienceId?: unknown })['experienceId'];
    if (typeof experienceId !== 'string' || experienceId.length === 0) {
      throw new HttpsError('permission-denied', 'This session is not scoped to any experience.');
    }
    const parsed = config.schema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.issues.map((i) => i.message).join('; '));
    }
    return toResponse(
      runHandler(config.functionName, request.auth.uid, () => config.handler(parsed.data, experienceId)),
    );
  });
}

export type { CallableAuth };
