import { TestBed } from '@angular/core/testing';

import { ExperienceRepositoryPort } from '@domain/ports/experience-repository.port';
import { StorageUploadPort } from '@domain/ports/storage-upload.port';
import { PuzzleExperience, draftExperience } from '@domain/models/puzzle-experience.model';
import { QuestionDefinition } from '@domain/models/question.model';

import { EXPERIENCE_REPOSITORY_PORT } from './experience.tokens';
import { STORAGE_UPLOAD_PORT } from './wizard.tokens';
import { PuzzlePreviewFacade } from './puzzle-preview.facade';

function question(id: string, overrides: Partial<QuestionDefinition> = {}): QuestionDefinition {
  return {
    questionId: id,
    prompt: `Prompt for ${id}`,
    correctAnswer: 'answer',
    acceptedVariants: [],
    clues: ['clue 1', 'clue 2', 'clue 3'],
    ...overrides,
  };
}

function fixtureExperience(overrides: Partial<PuzzleExperience> = {}): PuzzleExperience {
  return {
    ...draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: 'Ananya' }),
    questions: Array.from({ length: 9 }, (_, i) => question(`q${i + 1}`)),
    ...overrides,
  };
}

class FakeExperienceRepository implements ExperienceRepositoryPort {
  docs = new Map<string, PuzzleExperience>();
  async getById(experienceId: string): Promise<PuzzleExperience | null> {
    return this.docs.get(experienceId) ?? null;
  }
  async listByCreator(): Promise<readonly PuzzleExperience[]> {
    return [];
  }
  async create(experience: PuzzleExperience): Promise<void> {
    this.docs.set(experience.experienceId, experience);
  }
  async update(): Promise<void> {
    /* not used by Preview */
  }
}

class FakeStorageUploadPort implements StorageUploadPort {
  blob: Blob | null = null;
  async uploadRevealImage(): Promise<void> {
    /* not used by Preview */
  }
  async getRevealImageOriginalBlob(): Promise<Blob | null> {
    return this.blob;
  }
}

describe('PuzzlePreviewFacade', () => {
  let repository: FakeExperienceRepository;
  let storageUpload: FakeStorageUploadPort;
  let facade: PuzzlePreviewFacade;

  beforeEach(() => {
    repository = new FakeExperienceRepository();
    storageUpload = new FakeStorageUploadPort();

    TestBed.configureTestingModule({
      providers: [
        { provide: EXPERIENCE_REPOSITORY_PORT, useValue: repository },
        { provide: STORAGE_UPLOAD_PORT, useValue: storageUpload },
      ],
    });
    facade = TestBed.inject(PuzzlePreviewFacade);
  });

  describe('start', () => {
    it('loads the experience and seeds 9 locked pieces', async () => {
      const experience = fixtureExperience();
      repository.docs.set('exp_1', experience);

      await facade.start('exp_1');

      expect(facade.experience()?.experienceId).toBe('exp_1');
      expect(facade.score().piecesUnlocked).toBe(0);
      expect(facade.score().piecesRemaining).toBe(9);
      expect(facade.error()).toBeNull();
    });

    it('sets an error when the experience cannot be found', async () => {
      await facade.start('missing');
      expect(facade.error()).toContain('could not be found');
      expect(facade.experience()).toBeNull();
    });

    it('derives a board image object URL when a reveal image blob is available', async () => {
      repository.docs.set('exp_1', fixtureExperience());
      storageUpload.blob = new Blob(['fake']);

      await facade.start('exp_1');

      expect(facade.boardImageUrl()).toMatch(/^blob:/);
    });

    it('leaves the board image null when no reveal image has been uploaded yet', async () => {
      repository.docs.set('exp_1', fixtureExperience());
      storageUpload.blob = null;

      await facade.start('exp_1');

      expect(facade.boardImageUrl()).toBeNull();
    });
  });

  describe('gameplay', () => {
    beforeEach(async () => {
      repository.docs.set('exp_1', fixtureExperience());
      await facade.start('exp_1');
    });

    it('openQuestion sets the active question and its piece', () => {
      facade.openQuestion('q1');
      expect(facade.activeQuestion()?.questionId).toBe('q1');
      expect(facade.activePiece()).toEqual({ status: 'locked', earnedVia: null, cluesUsed: 0, pointsAwarded: 0 });
    });

    it('does not reopen an already-unlocked question', () => {
      facade.openQuestion('q1');
      facade.submitAnswer('answer');
      facade.closeQuestion();

      facade.openQuestion('q1');
      expect(facade.activeQuestion()).toBeNull();
    });

    it('submitAnswer unlocks the piece on a correct answer and updates the score', () => {
      facade.openQuestion('q1');
      const outcome = facade.submitAnswer('answer');

      expect(outcome?.correct).toBeTrue();
      expect(facade.score().piecesUnlocked).toBe(1);
      expect(facade.score().totalScore).toBe(100);
      expect(facade.lastFeedback()?.tier).toBe('youre_awesome');
    });

    it('submitAnswer reports an incorrect answer without changing the score', () => {
      facade.openQuestion('q1');
      const outcome = facade.submitAnswer('wrong');

      expect(outcome?.correct).toBeFalse();
      expect(facade.score().piecesUnlocked).toBe(0);
    });

    it('requestClue reveals clues in order and reduces the eventual point value', () => {
      facade.openQuestion('q1');
      facade.requestClue();

      expect(facade.activeQuestionClues()).toEqual(['clue 1']);
      expect(facade.activePiece()?.cluesUsed).toBe(1);

      const outcome = facade.submitAnswer('answer');
      expect(outcome?.correct && outcome.pointsAwarded).toBe(75);
    });

    it('requestPartnerHelp is unavailable until all clues are exhausted, then unlocks the piece', () => {
      facade.openQuestion('q1');
      expect(facade.canRequestPartnerHelpForActive()).toBeFalse();

      facade.requestClue();
      facade.requestClue();
      facade.requestClue();
      expect(facade.canRequestPartnerHelpForActive()).toBeTrue();

      facade.requestPartnerHelp();
      expect(facade.pieceFor('q1').status).toBe('unlocked');
      expect(facade.pieceFor('q1').earnedVia).toBe('partner_help');
      expect(facade.score().totalScore).toBe(10);
    });

    it('isComplete becomes true once all 9 pieces are unlocked', () => {
      for (let i = 1; i <= 9; i++) {
        facade.openQuestion(`q${i}`);
        facade.submitAnswer('answer');
      }
      expect(facade.isComplete()).toBeTrue();
      expect(facade.score().starRating).toBe(3);
    });

    it('restart resets pieces and clues without re-fetching the experience', () => {
      facade.openQuestion('q1');
      facade.submitAnswer('answer');
      expect(facade.score().piecesUnlocked).toBe(1);

      facade.restart();

      expect(facade.score().piecesUnlocked).toBe(0);
      expect(facade.experience()?.experienceId).toBe('exp_1');
    });
  });
});
