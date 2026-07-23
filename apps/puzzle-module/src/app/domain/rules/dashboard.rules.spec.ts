import { PuzzleExperience, draftExperience } from '../models/puzzle-experience.model';
import { groupExperiencesForDashboard, summarizeDashboard } from './dashboard.rules';

function experienceWithStatus(id: string, status: PuzzleExperience['status']): PuzzleExperience {
  return {
    ...draftExperience({ experienceId: id, creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: 'Ananya' }),
    status,
  };
}

describe('groupExperiencesForDashboard', () => {
  it('buckets draft, published, and completed experiences into their own groups', () => {
    const draft = experienceWithStatus('exp_draft', 'draft');
    const published = experienceWithStatus('exp_published', 'published');
    const completedExp = experienceWithStatus('exp_completed', 'completed');

    const groups = groupExperiencesForDashboard([draft, published, completedExp]);

    expect(groups.drafts).toEqual([draft]);
    expect(groups.published).toEqual([published]);
    expect(groups.completed).toEqual([completedExp]);
  });

  it('groups in_progress alongside published — both read as "live" to the Creator', () => {
    const published = experienceWithStatus('exp_published', 'published');
    const inProgress = experienceWithStatus('exp_in_progress', 'in_progress');

    const groups = groupExperiencesForDashboard([published, inProgress]);

    expect(groups.published).toEqual([published, inProgress]);
  });

  it('excludes archived experiences from every group', () => {
    const archived = experienceWithStatus('exp_archived', 'archived');

    const groups = groupExperiencesForDashboard([archived]);

    expect(groups.drafts).toEqual([]);
    expect(groups.published).toEqual([]);
    expect(groups.completed).toEqual([]);
  });

  it('preserves input order within each group', () => {
    const first = experienceWithStatus('exp_1', 'draft');
    const second = experienceWithStatus('exp_2', 'draft');

    const groups = groupExperiencesForDashboard([first, second]);

    expect(groups.drafts).toEqual([first, second]);
  });

  it('returns empty groups for an empty input', () => {
    expect(groupExperiencesForDashboard([])).toEqual({ drafts: [], published: [], completed: [] });
  });
});

describe('summarizeDashboard', () => {
  it('counts each bucket and a total that excludes archived experiences', () => {
    const experiences = [
      experienceWithStatus('exp_1', 'draft'),
      experienceWithStatus('exp_2', 'draft'),
      experienceWithStatus('exp_3', 'published'),
      experienceWithStatus('exp_4', 'in_progress'),
      experienceWithStatus('exp_5', 'completed'),
      experienceWithStatus('exp_6', 'archived'),
    ];

    expect(summarizeDashboard(experiences)).toEqual({
      totalCount: 5,
      draftCount: 2,
      publishedCount: 2,
      completedCount: 1,
    });
  });

  it('returns all-zero counts for an empty list', () => {
    expect(summarizeDashboard([])).toEqual({ totalCount: 0, draftCount: 0, publishedCount: 0, completedCount: 0 });
  });
});
