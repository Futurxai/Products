import { FormControl, FormGroup } from '@angular/forms';

import {
  displayNameFormatValidator,
  emailFormatValidator,
  passwordStrengthValidator,
  passwordsMatchValidator,
} from './auth-form-validators';

describe('emailFormatValidator', () => {
  const validator = emailFormatValidator();

  it('passes an empty value through (Validators.required owns emptiness)', () => {
    expect(validator(new FormControl(''))).toBeNull();
  });

  it('accepts a well-formed email', () => {
    expect(validator(new FormControl('vikram.rao@example.com'))).toBeNull();
  });

  it('rejects a malformed email with an emailFormat error', () => {
    expect(validator(new FormControl('not-an-email'))).toEqual({ emailFormat: true });
  });
});

describe('passwordStrengthValidator', () => {
  const validator = passwordStrengthValidator();

  it('passes an empty value through', () => {
    expect(validator(new FormControl(''))).toBeNull();
  });

  it('accepts a medium-or-better password', () => {
    expect(validator(new FormControl('DevTest123'))).toBeNull();
  });

  it('rejects a weak password, carrying the computed strength in the error', () => {
    expect(validator(new FormControl('abcdefgh'))).toEqual({ passwordTooWeak: { strength: 'weak' } });
  });
});

describe('displayNameFormatValidator', () => {
  const validator = displayNameFormatValidator();

  it('passes an empty value through', () => {
    expect(validator(new FormControl(''))).toBeNull();
  });

  it('accepts a normal display name', () => {
    expect(validator(new FormControl('Vikram Rao'))).toBeNull();
  });

  it('rejects a single-character name', () => {
    expect(validator(new FormControl('V'))).toEqual({ displayNameFormat: true });
  });
});

describe('passwordsMatchValidator', () => {
  function group(password: string, confirm: string): FormGroup {
    return new FormGroup({
      password: new FormControl(password),
      confirm: new FormControl(confirm),
    });
  }

  const validator = passwordsMatchValidator('password', 'confirm');

  it('passes while the confirmation field is still empty — not every keystroke should show a mismatch error', () => {
    expect(validator(group('DevTest123', ''))).toBeNull();
  });

  it('passes once both fields match', () => {
    expect(validator(group('DevTest123', 'DevTest123'))).toBeNull();
  });

  it('rejects once the confirmation field has content but does not match', () => {
    expect(validator(group('DevTest123', 'DevTest124'))).toEqual({ passwordsMismatch: true });
  });
});
