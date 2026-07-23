import { initialsFor } from './avatar.component';

describe('initialsFor', () => {
  it('takes the first and last initials for a multi-word name', () => {
    expect(initialsFor('Vikram Rao')).toBe('VR');
  });

  it('takes only the first initial for a single-word name', () => {
    expect(initialsFor('Vikram')).toBe('V');
  });

  it('uppercases lowercase input', () => {
    expect(initialsFor('vikram rao')).toBe('VR');
  });

  it('collapses extra whitespace between name parts', () => {
    expect(initialsFor('  Vikram   Rao  ')).toBe('VR');
  });

  it('uses the first and last of three or more parts, ignoring the middle', () => {
    expect(initialsFor('Vikram Kumar Rao')).toBe('VR');
  });

  it('falls back to "?" for an empty or whitespace-only name', () => {
    expect(initialsFor('')).toBe('?');
    expect(initialsFor('   ')).toBe('?');
  });
});
