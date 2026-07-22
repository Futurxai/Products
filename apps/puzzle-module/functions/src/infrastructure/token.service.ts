import { randomBytes, createHash } from 'node:crypto';

/**
 * Share-token generation and hashing. Module Contract §8: the token is
 * cryptographically random, minted server-side, and never derivable
 * from the experience's Firestore document ID. Only the HASH is ever
 * persisted (`puzzle_experiences_private.shareTokenHash`) — the raw
 * token exists only in the `publishExperience` response and the
 * recipient's URL, never at rest.
 */
export interface TokenService {
  generateShareToken(): string;
  hashShareToken(rawToken: string): string;
}

const TOKEN_PREFIX = 'pzl_';
const TOKEN_BYTES = 24;

export function createTokenService(): TokenService {
  return {
    generateShareToken(): string {
      return TOKEN_PREFIX + randomBytes(TOKEN_BYTES).toString('base64url');
    },
    hashShareToken(rawToken: string): string {
      return createHash('sha256').update(rawToken).digest('hex');
    },
  };
}
