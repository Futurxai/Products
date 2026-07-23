/**
 * How the Creator's Firebase Auth account was established. Both paths
 * converge on the same `puzzle_creators/{creatorId}` profile document —
 * `signupMethod` is metadata, not a behavioral fork past sign-up.
 */
export type SignupMethod = 'email' | 'google';

/**
 * The Creator's profile document, stored at `puzzle_creators/{creatorId}`
 * (see docs/puzzle-module/test-data/01-creators.json for representative
 * shapes and lovedigitally-web/firestore.rules for the owner-only access
 * rule). `creatorId` is always the Firebase Auth `uid` — never a
 * separately generated id — so the Firestore doc ID and the Auth
 * identity can never drift apart.
 *
 * Deliberately does NOT store `experienceIds`: the test-data fixture
 * carries that field, but persisting it here would mean every publish/
 * archive/create has to remember to keep two documents in sync. The
 * Dashboard queries `puzzle_experiences where creatorId == uid` instead
 * (`ExperienceRepositoryPort.listByCreator`, M3) — one source of truth.
 */
export interface Creator {
  readonly creatorId: string;
  readonly displayName: string;
  readonly email: string;
  readonly phone: string | null;
  readonly avatarUrl: string | null;
  readonly signupMethod: SignupMethod;
  readonly createdAt: Date;
}

/** A freshly-authenticated `Creator` profile, ready to be persisted by `CreatorRepositoryPort.create`. */
export function draftCreator(params: {
  creatorId: string;
  displayName: string;
  email: string;
  signupMethod: SignupMethod;
  avatarUrl?: string | null;
  phone?: string | null;
}): Creator {
  return {
    creatorId: params.creatorId,
    displayName: params.displayName,
    email: params.email,
    phone: params.phone ?? null,
    avatarUrl: params.avatarUrl ?? null,
    signupMethod: params.signupMethod,
    createdAt: new Date(),
  };
}
