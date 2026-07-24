export type ActorRole = 'creator' | 'recipient';

/**
 * Every event name this module ever logs — the Module Contract §6
 * envelope's `eventName` values, matching
 * `docs/puzzle-module/test-data/06-analytics-events.json` (the one
 * existing definition of this event model, seeded from the PRD).
 * Instrumentation (M5 Phase 1) always logs one of these; no event name
 * is ever invented ad hoc at a call site.
 *
 * Deliberately NOT every name that file contains — only the ones the
 * built product actually has a real moment for. `puzzle.created` /
 * `puzzle.updated` / `puzzle.published` / `puzzle.link_shared` /
 * `puzzle.archived` (Creator-side) and `reveal.interacted` /
 * `create_own.clicked` (illustrative-only) are not wired to anything
 * yet — left for a future pass, not fabricated to look complete.
 */
export type AnalyticsEventName =
  /** A Recipient's share link resolved successfully — covers both "Puzzle Opened" and "Share Link Opened" (the same real-world moment; the existing model has one event name for it, not two). */
  | 'recipient.link_opened'
  /** The Welcome screen actually rendered — fired once resolveLink() succeeds, since Welcome is always what a Recipient sees next in this app's flow. */
  | 'recipient.welcome_viewed'
  | 'question.answered_correct'
  | 'question.answered_incorrect'
  /** "Clue Used." */
  | 'hint.used'
  /** "Partner Help Used" — logged when the Ask Your Partner reveal actually resolves the piece, not merely when the dialog opens. */
  | 'partner_help.resolved'
  | 'piece.unlocked'
  /** Logged exactly once per experience, the instant the 9th piece resolves — never re-derived from a later `getCompletionSummary` read, which callers may repeat. */
  | 'puzzle.completed'
  /** The completion screen's celebration actually rendered. */
  | 'celebration.viewed';

/** Matches the Module Contract §6 envelope exactly: `{ eventId, eventName, experienceId, moduleType, actorRole, timestamp, payload }`. */
export interface AnalyticsEvent {
  readonly eventId: string;
  readonly eventName: AnalyticsEventName;
  readonly experienceId: string;
  readonly moduleType: 'puzzle';
  readonly actorRole: ActorRole;
  readonly timestamp: Date;
  readonly payload: Readonly<Record<string, unknown>>;
}
