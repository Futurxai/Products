/**
 * Framework-free auth form validation. Angular's Reactive Forms
 * `ValidatorFn` adapters (`core/forms/auth-form-validators.ts`, M3) wrap
 * these — the rules themselves know nothing about `AbstractControl`, so
 * the same logic could validate a signup payload server-side without
 * dragging Angular along.
 */

// RFC 5322 is far too permissive for a UI-level check; this is the
// pragmatic "looks like an email" pattern most production apps use,
// deliberately not exhaustive — Firebase Auth is the final authority.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export type PasswordStrength = 'too_short' | 'weak' | 'medium' | 'strong';

/**
 * Signup password policy (Module Contract has no stated minimum, so
 * this mirrors Firebase Auth's own floor — 6 chars — plus a stricter
 * app-level bar of 8, a letter, and a number, communicated via the
 * strength meter rather than blocking submission below "medium").
 */
export function passwordStrength(password: string): PasswordStrength {
  if (password.length < 8) {
    return 'too_short';
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  if (hasLetter && hasNumber && hasSymbol && password.length >= 12) {
    return 'strong';
  }
  if (hasLetter && hasNumber) {
    return 'medium';
  }
  return 'weak';
}

/** The minimum bar a signup form actually enforces — "medium" or better. */
export function isPasswordAcceptable(password: string): boolean {
  const strength = passwordStrength(password);
  return strength === 'medium' || strength === 'strong';
}

export function isValidDisplayName(displayName: string): boolean {
  const trimmed = displayName.trim();
  return trimmed.length >= 2 && trimmed.length <= 60;
}
