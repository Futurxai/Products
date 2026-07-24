import { TestBed } from '@angular/core/testing';

import { ExperienceRepositoryPort } from '@domain/ports/experience-repository.port';
import { PuzzleApiPort, PublishExperienceResult, ResolveShareTokenResult, SubmitAnswerResult, RequestClueResult, RequestPartnerHelpRevealResult, CompletionSummaryResult } from '@domain/ports/puzzle-api.port';
import { PuzzleExperience, draftExperience } from '@domain/models/puzzle-experience.model';
import { QuestionDefinition } from '@domain/models/question.model';

import { EXPERIENCE_REPOSITORY_PORT } from './experience.tokens';
import { PUZZLE_API_PORT } from './publish.tokens';
import { PublishExperienceFacade } from './publish-experience.facade';

function completeQuestion(id: string): QuestionDefinition {
  return { questionId: id, prompt: `Prompt for ${id}`, correctAnswer: 'answer', acceptedVariants: [], clues: ['a', 'b', 'c'] };
}

function fullyAuthoredExperience(overrides: Partial<PuzzleExperience> = {}): PuzzleExperience {
  return {
    ...draftExperience({ experienceId: 'exp_1', creatorId: 'cre_001', occasion: 'Anniversary', recipientDisplayName: 'Ananya' }),
    questions: Array.from({ length: 9 }, (_, i) => completeQuestion(`q${i + 1}`)),
    revealImagePath: 'puzzle_storage/cre_001/exp_1/reveal-image.jpg',
    welcomeNote: 'Welcome!',
    completionMessage: 'You did it!',
    partnerHelpChallenge: 'Buy me ice cream',
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
    /* not used */
  }
}

class FakePuzzleApiPort implements PuzzleApiPort {
  publishResult: PublishExperienceResult = { ok: true, shareToken: 'pzl_abc', shareUrl: 'https://x/e/pzl_abc', status: 'published' };
  publishError: Error | null = null;
  calls: string[] = [];

  async publishExperience(experienceId: string): Promise<PublishExperienceResult> {
    this.calls.push(experienceId);
    if (this.publishError) {
      throw this.publishError;
    }
    return this.publishResult;
  }
  async resolveShareToken(): Promise<ResolveShareTokenResult> {
    throw new Error('not used');
  }
  async submitAnswer(): Promise<SubmitAnswerResult> {
    throw new Error('not used');
  }
  async requestClue(): Promise<RequestClueResult> {
    throw new Error('not used');
  }
  async requestPartnerHelpReveal(): Promise<RequestPartnerHelpRevealResult> {
    throw new Error('not used');
  }
  async getCompletionSummary(): Promise<CompletionSummaryResult> {
    throw new Error('not used');
  }
  async logRecipientEvent(): Promise<void> {
    throw new Error('not used');
  }
}

describe('PublishExperienceFacade', () => {
  let repository: FakeExperienceRepository;
  let api: FakePuzzleApiPort;
  let facade: PublishExperienceFacade;

  beforeEach(() => {
    repository = new FakeExperienceRepository();
    api = new FakePuzzleApiPort();

    TestBed.configureTestingModule({
      providers: [
        { provide: EXPERIENCE_REPOSITORY_PORT, useValue: repository },
        { provide: PUZZLE_API_PORT, useValue: api },
      ],
    });
    facade = TestBed.inject(PublishExperienceFacade);
  });

  it('sets a not_found error when the experience does not exist', async () => {
    await facade.start('missing');

    expect(facade.error()).toContain('could not be found');
    expect(facade.errorKind()).toBe('not_found');
    expect(api.calls.length).toBe(0);
  });

  it('surfaces validation failures without ever calling the Cloud Function', async () => {
    repository.docs.set('exp_1', fullyAuthoredExperience({ revealImagePath: null }));

    await facade.start('exp_1');

    expect(facade.validation()?.ok).toBeFalse();
    expect(facade.validation()?.missingFields).toContain('revealImage');
    expect(api.calls.length).toBe(0);
    expect(facade.publishResult()).toBeNull();
  });

  it('publishes automatically once validation passes', async () => {
    repository.docs.set('exp_1', fullyAuthoredExperience());

    await facade.start('exp_1');

    expect(facade.validation()?.ok).toBeTrue();
    expect(api.calls).toEqual(['exp_1']);
    expect(facade.publishResult()).toEqual({ ok: true, shareToken: 'pzl_abc', shareUrl: 'https://x/e/pzl_abc', status: 'published' });
    expect(facade.error()).toBeNull();
  });

  it('surfaces a business failure from the Cloud Function using its own message', async () => {
    repository.docs.set('exp_1', fullyAuthoredExperience());
    api.publishResult = { ok: false, error: 'UNAUTHORIZED', message: 'Only the creator of this experience can publish it.' };

    await facade.start('exp_1');

    expect(facade.error()).toBe('Only the creator of this experience can publish it.');
    expect(facade.errorKind()).toBe('business');
    expect(facade.publishResult()).toBeNull();
  });

  it('surfaces a generic retry-able message for a genuine network/infra failure', async () => {
    repository.docs.set('exp_1', fullyAuthoredExperience());
    api.publishError = new Error('offline');

    await facade.start('exp_1');

    expect(facade.error()).toContain("Couldn't reach the server");
    expect(facade.errorKind()).toBe('infra');
  });

  it('surfaces a permission-specific message for a functions/permission-denied failure', async () => {
    repository.docs.set('exp_1', fullyAuthoredExperience());
    api.publishError = Object.assign(new Error('denied'), { code: 'functions/permission-denied' });

    await facade.start('exp_1');

    expect(facade.error()).toContain('do not have permission');
    expect(facade.errorKind()).toBe('infra');
  });

  it('publish() can be called again as a retry after a failure', async () => {
    repository.docs.set('exp_1', fullyAuthoredExperience());
    api.publishError = new Error('offline');
    await facade.start('exp_1');
    expect(facade.error()).not.toBeNull();

    api.publishError = null;
    await facade.publish();

    expect(facade.error()).toBeNull();
    expect(facade.publishResult()?.ok).toBeTrue();
    expect(api.calls.length).toBe(2);
  });
});
