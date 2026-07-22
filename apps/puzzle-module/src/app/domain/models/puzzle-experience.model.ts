import { QuestionDefinition } from './question.model';

/**
 * Lifecycle states — Module Contract §4.
 *
 *   draft --(publish)--> published --(first recipient action)--> in_progress --(9/9 resolved)--> completed --> archived
 *     ^                       |
 *     └──(unpublish, only if no progress exists)──┘
 */
export type ExperienceStatus = 'draft' | 'published' | 'in_progress' | 'completed' | 'archived';

/**
 * The full puzzle experience as the Creator authors it. This is the
 * canonical domain entity — it is NOT the same shape a Recipient's
 * client ever receives. `correctAnswer`/`clues` (inside `questions`)
 * and `revealImagePath` are legitimately visible here because this
 * models the Creator's own authoring view of their own content; the
 * recipient-safe projection that hides those fields is an
 * infrastructure/API concern (Module Contract §8), not a second domain
 * type — see `infrastructure/README.md`.
 */
export interface PuzzleExperience {
  readonly experienceId: string;
  readonly creatorId: string;
  /**
   * Only the HASH is ever persisted or retrievable (Module Contract
   * §8) — the raw token exists solely in the `publishExperience`
   * response and the recipient's URL, never at rest. Don't add a
   * `shareToken` field back here; there is nowhere for it to come from
   * on a subsequent read.
   */
  readonly shareTokenHash: string | null;
  readonly occasion: string;
  readonly emotion: string;
  readonly recipientDisplayName: string;
  readonly status: ExperienceStatus;
  readonly welcomeNote: string;
  readonly completionMessage: string;
  readonly partnerHelpChallenge: string;
  readonly lockedPatternImagePath: string;
  readonly revealImagePath: string | null;
  readonly questions: readonly QuestionDefinition[];
  readonly createdAt: Date;
  readonly publishedAt: Date | null;
  readonly completedAt: Date | null;
  readonly archivedAt: Date | null;
}

/** A brand-new, unpublished experience — the wizard's starting point. */
export function draftExperience(params: {
  experienceId: string;
  creatorId: string;
  occasion: string;
  recipientDisplayName: string;
}): PuzzleExperience {
  return {
    experienceId: params.experienceId,
    creatorId: params.creatorId,
    shareTokenHash: null,
    occasion: params.occasion,
    emotion: 'Love', // PRD §10 Business Rule #12 default; kept selectable, not hardcoded away
    recipientDisplayName: params.recipientDisplayName,
    status: 'draft',
    welcomeNote: '',
    completionMessage: '',
    partnerHelpChallenge: '',
    lockedPatternImagePath: 'puzzle_storage/_shared/patterns/frame-outline.svg',
    revealImagePath: null,
    questions: [],
    createdAt: new Date(),
    publishedAt: null,
    completedAt: null,
    archivedAt: null,
  };
}
