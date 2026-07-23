import { ExperienceStatus } from '@domain/models/puzzle-experience.model';
import { statusBadgeTone, statusLabel } from './status-badge.util';

describe('statusBadgeTone', () => {
  it('maps draft and archived to neutral', () => {
    expect(statusBadgeTone('draft')).toBe('neutral');
    expect(statusBadgeTone('archived')).toBe('neutral');
  });

  it('maps published and in_progress to info', () => {
    expect(statusBadgeTone('published')).toBe('info');
    expect(statusBadgeTone('in_progress')).toBe('info');
  });

  it('maps completed to success', () => {
    expect(statusBadgeTone('completed')).toBe('success');
  });
});

describe('statusLabel', () => {
  const cases: Array<[ExperienceStatus, string]> = [
    ['draft', 'Draft'],
    ['published', 'Published'],
    ['in_progress', 'In Progress'],
    ['completed', 'Completed'],
    ['archived', 'Archived'],
  ];

  for (const [status, label] of cases) {
    it(`labels ${status} as "${label}"`, () => {
      expect(statusLabel(status)).toBe(label);
    });
  }
});
