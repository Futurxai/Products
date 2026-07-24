/**
 * The Recipient's half of "sign in" — deliberately NOT `AuthPort`.
 * `AuthPort`/`AuthUser` (M3) model a Creator's persistent identity:
 * email/password or Google, a `displayName`, a `signupMethod`. A
 * Recipient session has none of that — it's a single anonymous custom
 * token, minted by `resolveShareToken` and scoped to one experience via
 * a custom claim, with no profile document and no long-lived identity
 * to speak of. Reusing `AuthPort` here would mean either stubbing out
 * fields that don't apply or loosening `AuthUser` until it no longer
 * documents what a Creator identity actually is — this port stays
 * minimal instead.
 *
 * Implemented by `infrastructure/firebase/recipient-session.service.ts`
 * via `@angular/fire/auth`'s `signInWithCustomToken`.
 */
export interface RecipientSessionPort {
  signInWithCustomToken(customToken: string): Promise<void>;
}
