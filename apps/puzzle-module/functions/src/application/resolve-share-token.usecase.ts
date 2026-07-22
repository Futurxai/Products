import { ExperienceStorePort } from '../domain/ports/experience-store.port';
import { TokenService } from '../infrastructure/token.service';
import { AuthService } from '../infrastructure/auth.service';
import { StorageService } from '../infrastructure/storage.service';
import { TokenNotFoundError } from '../domain/errors/domain-errors';
import { ScopedLogger } from '../config/logger';

export interface ResolveShareTokenDeps {
  experienceStore: ExperienceStorePort;
  tokenService: TokenService;
  authService: AuthService;
  storageService: StorageService;
  logger: ScopedLogger;
}

export interface ResolveShareTokenInput {
  shareToken: string;
}

export interface ResolveShareTokenOutput {
  experienceId: string;
  customToken: string;
  publicMeta: {
    occasion: string;
    emotion: string;
    recipientDisplayName: string;
    welcomeNote: string;
    status: string;
    lockedPatternImageUrl: string;
  };
}

/**
 * The Recipient's entry point. No auth required to CALL this function
 * (that's the point — the link itself is the credential), but it's the
 * one place that MINTS auth: on success, the Recipient is signed in as
 * a fresh anonymous user scoped to exactly this experience, silently,
 * with no login screen (Phase 5/6 architecture decision #2).
 */
export async function resolveShareToken(
  deps: ResolveShareTokenDeps,
  input: ResolveShareTokenInput,
): Promise<ResolveShareTokenOutput> {
  const shareTokenHash = deps.tokenService.hashShareToken(input.shareToken);
  const experienceId = await deps.experienceStore.findExperienceIdByShareTokenHash(shareTokenHash);

  if (!experienceId) {
    deps.logger.domainRejection('TOKEN_NOT_FOUND', 'Share token did not resolve to any experience');
    throw new TokenNotFoundError();
  }

  const experience = await deps.experienceStore.getExperience(experienceId);
  if (!experience) {
    // Defensive: the hash lookup just succeeded, so this would mean the
    // public doc was deleted out from under an otherwise-valid private
    // doc — an inconsistent state, not a normal "bad token" case, but
    // handled the same way from the caller's perspective.
    deps.logger.error('shareTokenHash resolved but experience document is missing', { experienceId });
    throw new TokenNotFoundError();
  }

  const { customToken } = await deps.authService.createExperienceSession(experienceId);

  deps.logger.info('Share token resolved', { experienceId });

  return {
    experienceId,
    customToken,
    publicMeta: {
      occasion: experience.occasion,
      emotion: experience.emotion,
      recipientDisplayName: experience.recipientDisplayName,
      welcomeNote: experience.welcomeNote,
      status: experience.status,
      lockedPatternImageUrl: deps.storageService.getPublicUrl(experience.lockedPatternImagePath),
    },
  };
}
