import { ExperienceStorePort } from '../domain/ports/experience-store.port';
import { TokenService } from '../infrastructure/token.service';
import { canPublish } from '../domain/rules/lifecycle.rules';
import { ExperienceNotFoundError, IncompleteExperienceError, UnauthorizedError } from '../domain/errors/domain-errors';
import { SHARE_BASE_URL } from '../config/app-config';
import { ScopedLogger } from '../config/logger';

export interface PublishExperienceDeps {
  experienceStore: ExperienceStorePort;
  tokenService: TokenService;
  logger: ScopedLogger;
}

export interface PublishExperienceInput {
  experienceId: string;
  requesterUid: string;
}

export interface PublishExperienceOutput {
  shareToken: string;
  shareUrl: string;
  /**
   * Always `'published'` — this call only ever resolves after
   * `markPublished` succeeds. Included so the response matches
   * `domain/ports/puzzle-api.port.ts`'s `PublishExperienceSuccess`
   * shape exactly (M3 Feature 5 found this field missing here while
   * wiring the client adapter against that already-declared contract).
   */
  status: 'published';
}

/**
 * Publish flow: authorize -> validate (domain rule) -> mint a token
 * the client never derives itself -> atomically flip status (infra
 * transaction, see `firestore-experience.store.ts`).
 */
export async function publishExperience(
  deps: PublishExperienceDeps,
  input: PublishExperienceInput,
): Promise<PublishExperienceOutput> {
  const experience = await deps.experienceStore.getExperience(input.experienceId);
  if (!experience) {
    throw new ExperienceNotFoundError(input.experienceId);
  }

  if (experience.creatorId !== input.requesterUid) {
    deps.logger.domainRejection('UNAUTHORIZED', 'Publish attempted by a non-owner', {
      experienceId: input.experienceId,
      actorUid: input.requesterUid,
    });
    throw new UnauthorizedError('Only the creator of this experience can publish it.');
  }

  const validation = canPublish(experience);
  if (!validation.ok) {
    deps.logger.domainRejection('INCOMPLETE_EXPERIENCE', 'Publish rejected — experience incomplete', {
      experienceId: input.experienceId,
      missingFields: validation.missingFields,
    });
    throw new IncompleteExperienceError(validation.missingFields);
  }

  const rawToken = deps.tokenService.generateShareToken();
  const shareTokenHash = deps.tokenService.hashShareToken(rawToken);

  await deps.experienceStore.markPublished({
    experienceId: input.experienceId,
    shareTokenHash,
    publishedAt: new Date(),
  });

  deps.logger.info('Experience published', { experienceId: input.experienceId });

  return {
    shareToken: rawToken,
    shareUrl: `${SHARE_BASE_URL}/${rawToken}`,
    status: 'published',
  };
}
