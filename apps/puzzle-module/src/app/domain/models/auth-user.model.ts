import { SignupMethod } from './creator.model';

/**
 * The identity Firebase Auth itself knows about — deliberately a
 * smaller shape than `Creator`. Auth owns "who is this and are they
 * signed in"; Firestore's `puzzle_creators` doc owns the profile
 * (`phone`, app-specific fields). Keeping them as two types (not one
 * `Creator` populated partially by Auth and partially by Firestore)
 * means `AuthPort` never has to fake fields it has no way to know.
 */
export interface AuthUser {
  readonly uid: string;
  readonly email: string;
  readonly displayName: string | null;
  readonly photoUrl: string | null;
  readonly signupMethod: SignupMethod;
}
