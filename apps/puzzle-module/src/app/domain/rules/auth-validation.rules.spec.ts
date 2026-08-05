import { isValidDisplayName, isValidEmail, isPasswordAcceptable, passwordStrength } from './auth-validation.rules';

describe('isValidEmail', () => {
  it('accepts well-formed emails', () => {
    expect(isValidEmail('vikram.rao@example.com')).toBeTrue();
    expect(isValidEmail('a@b.co')).toBeTrue();
  });

  it('tolerates surrounding whitespace', () => {
    expect(isValidEmail('  vikram.rao@example.com  ')).toBeTrue();
  });

  it('rejects missing @, missing domain, or embedded spaces', () => {
    expect(isValidEmail('vikram.rao')).toBeFalse();
    expect(isValidEmail('vikram.rao@')).toBeFalse();
    expect(isValidEmail('vikram rao@example.com')).toBeFalse();
    expect(isValidEmail('')).toBeFalse();
  });
});

describe('passwordStrength', () => {
  it('flags anything under 8 characters as too_short regardless of content', () => {
    expect(passwordStrength('a1!')).toBe('too_short');
    expect(passwordStrength('Ab1!Ab1')).toBe('too_short');
  });

  it('flags letters-only or numbers-only as weak', () => {
    expect(passwordStrength('abcdefgh')).toBe('weak');
    expect(passwordStrength('12345678')).toBe('weak');
  });

  it('flags a letter+number mix of at least 8 chars as medium', () => {
    expect(passwordStrength('DevTest123')).toBe('medium');
  });

  it('flags a letter+number+symbol mix of at least 12 chars as strong', () => {
    expect(passwordStrength('DevTest@123456')).toBe('strong');
  });

  it('does not upgrade to strong below 12 chars even with a symbol', () => {
    expect(passwordStrength('DevT@123')).toBe('medium');
  });
});

describe('isPasswordAcceptable', () => {
  it('accepts medium and strong passwords', () => {
    expect(isPasswordAcceptable('DevTest123')).toBeTrue();
    expect(isPasswordAcceptable('DevTest@123456')).toBeTrue();
  });

  it('rejects too_short and weak passwords', () => {
    expect(isPasswordAcceptable('a1!')).toBeFalse();
    expect(isPasswordAcceptable('abcdefgh')).toBeFalse();
  });
});

describe('isValidDisplayName', () => {
  it('accepts a normal name', () => {
    expect(isValidDisplayName('Vikram Rao')).toBeTrue();
  });

  it('rejects names shorter than 2 characters after trimming', () => {
    expect(isValidDisplayName('V')).toBeFalse();
    expect(isValidDisplayName('  V  ')).toBeFalse();
  });

  it('rejects names longer than 60 characters', () => {
    expect(isValidDisplayName('A'.repeat(61))).toBeFalse();
  });

  it('accepts exactly 60 characters', () => {
    expect(isValidDisplayName('A'.repeat(60))).toBeTrue();
  });
});
