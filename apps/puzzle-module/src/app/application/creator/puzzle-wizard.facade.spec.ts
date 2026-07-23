import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ExperienceRepositoryPort } from '@domain/ports/experience-repository.port';
import { StorageUploadPort } from '@domain/ports/storage-upload.port';
import { Creator } from '@domain/models/creator.model';
import { PuzzleExperience, draftExperience } from '@domain/models/puzzle-experience.model';
import { emptyQuestion } from '@domain/models/question.model';
import { NotAuthenticatedError } from '@domain/errors/auth-errors';

import { AuthFacade } from './auth.facade';
import { EXPERIENCE_REPOSITORY_PORT } from './experience.tokens';
import { STORAGE_UPLOAD_PORT } from './wizard.tokens';
import { PuzzleWizardFacade, upsertQuestion } from './puzzle-wizard.facade';

const creator: Creator = {
  creatorId: 'cre_001',
  displayName: 'Vikram Rao',
  email: 'vikram.rao@example.com',
  phone: null,
  avatarUrl: null,
  signupMethod: 'email',
  createdAt: new Date('2026-01-04T09:12:00+05:30'),
};

class FakeExperienceRepository implements ExperienceRepositoryPort {
  docs = new Map<string, PuzzleExperience>();
  createCalls: PuzzleExperience[] = [];
  updateCalls: Array<{ experienceId: string; changes: Partial<PuzzleExperience> }> = [];
  updateShouldFail = false;

  async getById(experienceId: string): Promise<PuzzleExperience | null> {
    return this.docs.get(experienceId) ?? null;
  }
  async listByCreator(): Promise<readonly PuzzleExperience[]> {
    return [];
  }
  async create(experience: PuzzleExperience): Promise<void> {
    this.createCalls.push(experience);
    this.docs.set(experience.experienceId, experience);
  }
  async update(experienceId: string, changes: Partial<PuzzleExperience>): Promise<void> {
    this.updateCalls.push({ experienceId, changes });
    if (this.updateShouldFail) {
      throw new Error('boom');
    }
    const existing = this.docs.get(experienceId);
    if (existing) {
      this.docs.set(experienceId, { ...existing, ...changes });
    }
  }
}

class FakeStorageUploadPort implements StorageUploadPort {
  calls: Array<{ creatorId: string; experienceId: string; file: File }> = [];
  shouldFail = false;

  async uploadRevealImage(creatorId: string, experienceId: string, file: File): Promise<void> {
    this.calls.push({ creatorId, experienceId, file });
    if (this.shouldFail) {
      throw new Error('upload failed');
    }
  }
}

describe('PuzzleWizardFacade', () => {
  let repository: FakeExperienceRepository;
  let storageUpload: FakeStorageUploadPort;
  let currentCreator: ReturnType<typeof signal<Creator | null>>;
  let facade: PuzzleWizardFacade;

  beforeEach(() => {
    repository = new FakeExperienceRepository();
    storageUpload = new FakeStorageUploadPort();
    currentCreator = signal<Creator | null>(creator);

    TestBed.configureTestingModule({
      providers: [
        { provide: EXPERIENCE_REPOSITORY_PORT, useValue: repository },
        { provide: STORAGE_UPLOAD_PORT, useValue: storageUpload },
        { provide: AuthFacade, useValue: { currentCreator } as unknown as AuthFacade },
      ],
    });
    facade = TestBed.inject(PuzzleWizardFacade);
  });

  describe('startNewDraft', () => {
    it('creates and persists a fresh draft scoped to the signed-in creator', async () => {
      const experienceId = await facade.startNewDraft();

      expect(repository.createCalls.length).toBe(1);
      expect(repository.createCalls[0].experienceId).toBe(experienceId);
      expect(repository.createCalls[0].creatorId).toBe('cre_001');
      expect(repository.createCalls[0].status).toBe('draft');
      expect(facade.draft()?.experienceId).toBe(experienceId);
      expect(facade.currentStep()).toBe('occasion');
    });

    it('throws NotAuthenticatedError when there is no signed-in creator', async () => {
      currentCreator.set(null);
      await expectAsync(facade.startNewDraft()).toBeRejectedWith(new NotAuthenticatedError());
    });
  });

  describe('loadDraft', () => {
    it('sets an error when the experience does not exist', async () => {
      await facade.loadDraft('missing');
      expect(facade.error()).toBe('This puzzle could not be found.');
      expect(facade.draft()).toBeNull();
    });

    it('sets an error when the experience is no longer a draft', async () => {
      const published = { ...draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: 'Ananya' }), status: 'published' as const };
      repository.docs.set('exp_1', published);

      await facade.loadDraft('exp_1');

      expect(facade.error()).toContain('already been published');
      expect(facade.draft()).toBeNull();
    });

    it('resumes at the first incomplete step — occasion is done, image is the next gap', async () => {
      const draft = { ...draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: '' }), emotion: 'Love' };
      repository.docs.set('exp_1', draft);

      await facade.loadDraft('exp_1');

      expect(facade.draft()?.experienceId).toBe('exp_1');
      expect(facade.currentStep()).toBe('image');
    });

    it('resumes further along once occasion and image are both done', async () => {
      const draft = {
        ...draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: '' }),
        emotion: 'Love',
        revealImagePath: 'puzzle_storage/cre_001/exp_1/reveal-image.jpg',
      };
      repository.docs.set('exp_1', draft);

      await facade.loadDraft('exp_1');

      expect(facade.currentStep()).toBe('recipient');
    });
  });

  describe('autosave', () => {
    beforeEach(async () => {
      await facade.startNewDraft();
      repository.createCalls = [];
    });

    it('optimistically updates the local draft immediately', () => {
      facade.updateOccasionEmotion('Anniversary', 'Love');
      expect(facade.draft()?.occasion).toBe('Anniversary');
      expect(facade.draft()?.emotion).toBe('Love');
      expect(facade.hasPendingChanges()).toBeTrue();
    });

    it('debounces repeated changes into a single write 800ms after the last one', fakeAsync(() => {
      facade.updateOccasionEmotion('A', 'Love');
      tick(400);
      facade.updateOccasionEmotion('Anniversary', 'Love');
      tick(400);
      expect(repository.updateCalls.length).toBe(0); // still within the debounce window from the second edit

      tick(400);
      expect(repository.updateCalls.length).toBe(1);
      expect(repository.updateCalls[0].changes).toEqual({ occasion: 'Anniversary', emotion: 'Love' });
      expect(facade.hasPendingChanges()).toBeFalse();
      expect(facade.lastSavedAt()).not.toBeNull();
    }));

    it('merges changes from different fields into one flush', fakeAsync(() => {
      facade.updateOccasionEmotion('Anniversary', 'Love');
      facade.updateRecipientDetails('Ananya', 'Hi!');
      tick(800);

      expect(repository.updateCalls.length).toBe(1);
      expect(repository.updateCalls[0].changes).toEqual({
        occasion: 'Anniversary',
        emotion: 'Love',
        recipientDisplayName: 'Ananya',
        welcomeNote: 'Hi!',
      });
    }));

    it('keeps hasPendingChanges true and retries after a failed save', fakeAsync(() => {
      repository.updateShouldFail = true;
      facade.updateOccasionEmotion('Anniversary', 'Love');
      tick(800);

      expect(facade.hasPendingChanges()).toBeTrue();
      expect(facade.error()).toContain('Could not save');

      repository.updateShouldFail = false;
      tick(800); // the retry trigger fired inside the catch block

      expect(repository.updateCalls.length).toBe(2);
      expect(facade.hasPendingChanges()).toBeFalse();
    }));
  });

  describe('uploadImage', () => {
    beforeEach(async () => {
      await facade.startNewDraft();
    });

    it('uploads via the storage port scoped to the draft creator/experience, and returns true on success', async () => {
      const file = new File([new Uint8Array(1)], 'photo.jpg', { type: 'image/jpeg' });
      const result = await facade.uploadImage(file);

      expect(result).toBeTrue();
      expect(storageUpload.calls[0].creatorId).toBe('cre_001');
      expect(storageUpload.calls[0].experienceId).toBe(facade.draft()!.experienceId);
      expect(facade.imageUploading()).toBeFalse();
    });

    it('sets an error and returns false when the upload fails', async () => {
      storageUpload.shouldFail = true;
      const file = new File([new Uint8Array(1)], 'photo.jpg', { type: 'image/jpeg' });

      const result = await facade.uploadImage(file);

      expect(result).toBeFalse();
      expect(facade.error()).toContain('Could not upload');
    });
  });

  describe('refreshDraft', () => {
    it('re-fetches the experience and replaces the local draft', async () => {
      await facade.startNewDraft();
      const experienceId = facade.draft()!.experienceId;
      repository.docs.set(experienceId, { ...facade.draft()!, revealImagePath: 'puzzle_storage/cre_001/exp/reveal-image.jpg' });

      await facade.refreshDraft();

      expect(facade.draft()?.revealImagePath).toBe('puzzle_storage/cre_001/exp/reveal-image.jpg');
    });
  });

  describe('step navigation', () => {
    beforeEach(async () => {
      await facade.startNewDraft();
    });

    it('goNext advances one step, goBack retreats one step', async () => {
      expect(facade.currentStep()).toBe('occasion');
      await facade.goNext();
      expect(facade.currentStep()).toBe('image');
      await facade.goBack();
      expect(facade.currentStep()).toBe('occasion');
    });

    it('does not go past the first or last step', async () => {
      await facade.goBack();
      expect(facade.currentStep()).toBe('occasion');

      for (let i = 0; i < 10; i++) {
        await facade.goNext();
      }
      expect(facade.currentStep()).toBe('review');
    });

    it('flushes pending changes before switching steps', async () => {
      facade.updateOccasionEmotion('Anniversary', 'Love');
      expect(repository.updateCalls.length).toBe(0);

      await facade.goNext();

      expect(repository.updateCalls.length).toBe(1);
      expect(repository.updateCalls[0].changes).toEqual({ occasion: 'Anniversary', emotion: 'Love' });
    });
  });

  describe('flushNow', () => {
    it('immediately writes pending changes without waiting for the debounce', async () => {
      await facade.startNewDraft();
      facade.updateOccasionEmotion('Anniversary', 'Love');

      await facade.flushNow();

      expect(repository.updateCalls.length).toBe(1);
    });
  });

  describe('stepCompletion', () => {
    it('is null before a draft is loaded', () => {
      expect(facade.stepCompletion()).toBeNull();
    });

    it('reflects the current draft state', async () => {
      await facade.startNewDraft();
      expect(facade.stepCompletion()?.occasion).toBeFalse();

      facade.updateOccasionEmotion('Anniversary', 'Love');
      expect(facade.stepCompletion()?.occasion).toBeTrue();
    });
  });
});

describe('upsertQuestion', () => {
  it('inserts a new question when none exists yet for that id', () => {
    const result = upsertQuestion([], 'q1', { prompt: 'Where did we meet?' });
    expect(result.length).toBe(1);
    expect(result[0].questionId).toBe('q1');
    expect(result[0].prompt).toBe('Where did we meet?');
  });

  it('merges changes into an existing question rather than duplicating it', () => {
    const existing = [{ ...emptyQuestion('q1'), prompt: 'Where did we meet?' }];
    const result = upsertQuestion(existing, 'q1', { correctAnswer: 'Cubbon Park' });

    expect(result.length).toBe(1);
    expect(result[0].prompt).toBe('Where did we meet?');
    expect(result[0].correctAnswer).toBe('Cubbon Park');
  });

  it('keeps questions sorted in canonical q1..q9 order regardless of edit order', () => {
    let questions = upsertQuestion([], 'q3', { prompt: 'Q3' });
    questions = upsertQuestion(questions, 'q1', { prompt: 'Q1' });
    questions = upsertQuestion(questions, 'q2', { prompt: 'Q2' });

    expect(questions.map((q) => q.questionId)).toEqual(['q1', 'q2', 'q3']);
  });
});
