import { EarnedVia } from '../models/question.model';

/**
 * Feedback tier and copy bank — PRD §13, Reward System. The
 * earnedVia → tier mapping is a business rule (kept here, not
 * scattered into the Cloud Functions use-case that happens to need
 * it); the message text is product copy that travels with it so the
 * two never drift out of sync.
 */
export type FeedbackTier = 'youre_awesome' | 'nudge_to_remember' | 'teasing_inside_jokes';

export function feedbackTierFor(earnedVia: EarnedVia): FeedbackTier {
  switch (earnedVia) {
    case 'direct':
      return 'youre_awesome';
    case 'clue':
      return 'nudge_to_remember';
    case 'partner_help':
      return 'teasing_inside_jokes';
  }
}

const FEEDBACK_MESSAGES: Readonly<Record<FeedbackTier, readonly string[]>> = {
  youre_awesome: ["You're awesome! 🎉", 'Nailed it — no help needed.', 'Look at you go!'],
  nudge_to_remember: [
    'Needed a little nudge, but you got there!',
    'A clue never hurt anybody. Piece unlocked!',
    'Memory jogged — piece is yours.',
  ],
  teasing_inside_jokes: [
    'Had to phone a friend, huh? 😏',
    'Someone owes their partner an ice cream now.',
    'The bargain has been struck — piece unlocked.',
  ],
};

/**
 * Picks one message for a tier. Takes an explicit `random` function
 * (defaulting to `Math.random`) purely so this stays a pure,
 * deterministically-testable function — tests pass a fixed value
 * instead of stubbing global `Math.random`.
 */
export function pickFeedbackMessage(tier: FeedbackTier, random: () => number = Math.random): string {
  const options = FEEDBACK_MESSAGES[tier];
  const index = Math.floor(random() * options.length);
  return options[Math.min(index, options.length - 1)];
}
