import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ExperienceRepositoryPort } from '@domain/ports/experience-repository.port';
import { PuzzleExperience, draftExperience } from '@domain/models/puzzle-experience.model';
import { Creator } from '@domain/models/creator.model';

import { AuthFacade } from './auth.facade';
import { EXPERIENCE_REPOSITORY_PORT } from './experience.tokens';
import { CreatorDashboardFacade } from './creator-dashboard.facade';

class FakeExperienceRepository implements ExperienceRepositoryPort {
  listByCreatorCalls: string[] = [];
  nextResult: readonly PuzzleExperience[] = [];
  shouldFail = false;

  async getById(): Promise<PuzzleExperience | null> {
    return null;
  }
  async listByCreator(creatorId: string): Promise<readonly PuzzleExperience[]> {
    this.listByCreatorCalls.push(creatorId);
    if (this.shouldFail) {
      throw new Error('boom');
    }
    return this.nextResult;
  }
  async create(): Promise<void> {}
  async update(): Promise<void> {}
}

const creator: Creator = {
  creatorId: 'cre_001',
  displayName: 'Vikram Rao',
  email: 'vikram.rao@example.com',
  phone: null,
  avatarUrl: null,
  signupMethod: 'email',
  createdAt: new Date('2026-01-04T09:12:00+05:30'),
};

describe('CreatorDashboardFacade', () => {
  let repository: FakeExperienceRepository;
  let currentCreator: ReturnType<typeof signal<Creator | null>>;
  let facade: CreatorDashboardFacade;

  beforeEach(() => {
    repository = new FakeExperienceRepository();
    currentCreator = signal<Creator | null>(creator);

    TestBed.configureTestingModule({
      providers: [
        { provide: EXPERIENCE_REPOSITORY_PORT, useValue: repository },
        { provide: AuthFacade, useValue: { currentCreator } as unknown as AuthFacade },
      ],
    });

    facade = TestBed.inject(CreatorDashboardFacade);
  });

  it('starts empty, not loaded, not loading', () => {
    expect(facade.loading()).toBeFalse();
    expect(facade.isEmpty()).toBeFalse();
    expect(facade.summary()).toEqual({ totalCount: 0, draftCount: 0, publishedCount: 0, completedCount: 0 });
  });

  it('load() does nothing and marks loaded when there is no signed-in creator', async () => {
    currentCreator.set(null);

    await facade.load();

    expect(repository.listByCreatorCalls).toEqual([]);
    expect(facade.isEmpty()).toBeTrue();
  });

  it('load() fetches by the current creator id and populates groups/summary', async () => {
    const draft = draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: 'Ananya' });
    const published = { ...draftExperience({ experienceId: 'exp_2', creatorId: 'cre_001', occasion: 'Birthday', recipientDisplayName: 'Zoya' }), status: 'published' as const };
    repository.nextResult = [draft, published];

    await facade.load();

    expect(repository.listByCreatorCalls).toEqual(['cre_001']);
    expect(facade.groups().drafts).toEqual([draft]);
    expect(facade.groups().published).toEqual([published]);
    expect(facade.summary().totalCount).toBe(2);
    expect(facade.loading()).toBeFalse();
    expect(facade.error()).toBeNull();
  });

  it('isEmpty is true only after a completed load with zero results', async () => {
    expect(facade.isEmpty()).toBeFalse();
    await facade.load();
    expect(facade.isEmpty()).toBeTrue();
  });

  it('surfaces a readable error and clears loading when the repository rejects', async () => {
    repository.shouldFail = true;

    await facade.load();

    expect(facade.error()).toBe('Could not load your puzzles. Please try again.');
    expect(facade.loading()).toBeFalse();
  });

  it('refresh() delegates to load()', async () => {
    repository.nextResult = [draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: 'Ananya' })];

    await facade.refresh();

    expect(repository.listByCreatorCalls).toEqual(['cre_001']);
    expect(facade.summary().totalCount).toBe(1);
  });
});
