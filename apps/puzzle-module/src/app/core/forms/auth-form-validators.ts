import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { isPasswordAcceptable, isValidDisplayName, isValidEmail, passwordStrength } from '@domain/rules/auth-validation.rules';

/**
 * `ValidatorFn` adapters over the framework-free rules in
 * `domain/rules/auth-validation.rules.ts`. Kept here (core/, not
 * domain/) because `AbstractControl`/`ValidatorFn` are Angular Forms
 * types — the domain rules themselves stay usable outside Angular, this
 * is just the wiring.
 *
 * Every validator treats an empty value as valid — pair with
 * `Validators.required` for emptiness, so "required" and "malformed"
 * stay two distinct, independently-worded error states in the UI.
 */

export function emailFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string;
    if (!value) {
      return null;
    }
    return isValidEmail(value) ? null : { emailFormat: true };
  };
}

export function passwordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string;
    if (!value) {
      return null;
    }
    return isPasswordAcceptable(value) ? null : { passwordTooWeak: { strength: passwordStrength(value) } };
  };
}

export function displayNameFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string;
    if (!value) {
      return null;
    }
    return isValidDisplayName(value) ? null : { displayNameFormat: true };
  };
}

/** A group-level validator (attach to the `FormGroup`, not either individual control) — confirmation only matters once something has been typed into it. */
export function passwordsMatchValidator(passwordControlName: string, confirmControlName: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordControlName)?.value as string | undefined;
    const confirm = group.get(confirmControlName)?.value as string | undefined;
    if (!confirm) {
      return null;
    }
    return password === confirm ? null : { passwordsMismatch: true };
  };
}
