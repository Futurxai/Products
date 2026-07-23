import { Timestamp } from '@angular/fire/firestore';

import { PuzzleExperience, draftExperience } from '@domain/models/puzzle-experience.model';
import { emptyQuestion } from '@domain/models/question.model';

import { fromDocs, toPrivateDocForCreate, toPrivateUpdateFields, toPublicDoc, toPublicUpdateFields } from './firestore-experience.repository';

describe('firestore-experience.repository mapping', () => {
  const experience: PuzzleExperience = {
    ...draftExperience({
      experienceId: 'exp_001',
      creatorId: 'cre_001',
      occasion: 'Anniversary',
      recipientDisplayName: 'Ananya',
    }),
    status: 'published',
    shareTokenHash: 'hash_abc',
    welcomeNote: 'Welcome!',
    completionMessage: 'You did it!',
    partnerHelpChallenge: 'Text Vikram for help.',
    revealImagePath: 'puzzle_storage/cre_001/exp_001/reveal-image.jpg',
    questions: [{ ...emptyQuestion('q1'), prompt: 'Where did we meet?', correctAnswer: 'Cubbon Park' }],
    publishedAt: new Date('2026-02-01T00:00:00Z'),
  };

  describe('toPublicDoc / toPrivateDocForCreate / fromDocs round-trip', () => {
    it('round-trips every field through the public+private split', () => {
      const pub = toPublicDoc(experience);
      const priv = toPrivateDocForCreate(experience);
      const roundTripped = fromDocs(experience.experienceId, pub, { ...priv, shareTokenHash: experience.shareTokenHash });

      expect(roundTripped).toEqual(experience);
    });

    it('toPrivateDocForCreate omits the shareTokenHash key entirely (Firestore Rules reject its presence on create)', () => {
      const priv = toPrivateDocForCreate(experience);
      expect('shareTokenHash' in priv).toBeFalse();
    });

    it('toPublicDoc converts Date fields to Firestore Timestamps, and null stays null', () => {
      const pub = toPublicDoc(experience);
      expect(pub.publishedAt instanceof Timestamp).toBeTrue();
      expect(pub.completedAt).toBeNull();
      expect(pub.archivedAt).toBeNull();
    });
  });

  describe('fromDocs', () => {
    it('defaults sensitive fields when the private doc does not exist yet', () => {
      const pub = toPublicDoc(experience);
      const result = fromDocs(experience.experienceId, pub, null);

      expect(result.shareTokenHash).toBeNull();
      expect(result.completionMessage).toBe('');
      expect(result.partnerHelpChallenge).toBe('');
      expect(result.revealImagePath).toBeNull();
      expect(result.questions).toEqual([]);
    });
  });

  describe('toPublicUpdateFields', () => {
    it('includes only present, publicly-editable keys', () => {
      expect(toPublicUpdateFields({ welcomeNote: 'New note' })).toEqual({ welcomeNote: 'New note' });
      expect(toPublicUpdateFields({})).toEqual({});
    });

    it('never includes status/publishedAt/completedAt/archivedAt/creatorId — those only change via the publishExperience Cloud Function', () => {
      const fields = toPublicUpdateFields({
        welcomeNote: 'New note',
        status: 'published',
        publishedAt: new Date(),
        completedAt: new Date(),
        archivedAt: new Date(),
        creatorId: 'someone-else',
      });

      expect(fields).toEqual({ welcomeNote: 'New note' });
    });
  });

  describe('toPrivateUpdateFields', () => {
    it('includes only present, privately-editable keys', () => {
      expect(toPrivateUpdateFields({ completionMessage: 'Great job!' })).toEqual({ completionMessage: 'Great job!' });
    });

    it('never includes shareTokenHash', () => {
      const fields = toPrivateUpdateFields({ completionMessage: 'Great job!', shareTokenHash: 'sneaky' });
      expect(fields).toEqual({ completionMessage: 'Great job!' });
    });
  });
});
