/**
 * Verifies the actual deployed Firestore ruleset
 * (`lovedigitally-web/firestore.rules`, symlinked into
 * `apps/puzzle-module/firestore.rules` — see that app's README for
 * why) against real client-permission scenarios, using
 * `@firebase/rules-unit-testing`. This is the one place the security
 * boundary from Module Contract §8 is checked directly, rather than
 * inferred from the application code that happens to respect it.
 *
 * The rules content is read directly via `fs.readFileSync` rather than
 * relying on `firebase.json`'s `firestore.rules` path — that path
 * resolution goes through the Firebase CLI's project-directory
 * boundary check, which is irrelevant here; this test only needs the
 * rules *text*, handed straight to `initializeTestEnvironment`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

const RULES_PATH = resolve(__dirname, '../../../../../lovedigitally-web/firestore.rules');

describe('Firestore security rules — puzzle_* collections', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'lovedigitally-app',
      firestore: { rules: readFileSync(RULES_PATH, 'utf8') },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  afterEach(async () => {
    await testEnv.clearFirestore();
  });

  async function seedPublicExperience(creatorId: string, experienceId: string): Promise<void> {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('puzzle_experiences').doc(experienceId).set({
        creatorId,
        occasion: 'Anniversary',
        status: 'draft',
        publishedAt: null,
        completedAt: null,
        archivedAt: null,
      });
    });
  }

  describe('puzzle_experiences (public projection)', () => {
    it('is readable by anyone, including a fully unauthenticated client', async () => {
      await seedPublicExperience('cre_owner', 'exp_1');
      const unauthed = testEnv.unauthenticatedContext();
      await assertSucceeds(unauthed.firestore().collection('puzzle_experiences').doc('exp_1').get());
    });

    it('allows the owning creator to create their own draft', async () => {
      const creator = testEnv.authenticatedContext('cre_owner');
      await assertSucceeds(
        creator.firestore().collection('puzzle_experiences').doc('exp_new').set({
          creatorId: 'cre_owner',
          occasion: 'Birthday',
          status: 'draft',
          publishedAt: null,
          completedAt: null,
          archivedAt: null,
        }),
      );
    });

    it('rejects creating an experience with someone else\'s creatorId', async () => {
      const creator = testEnv.authenticatedContext('cre_owner');
      await assertFails(
        creator.firestore().collection('puzzle_experiences').doc('exp_spoofed').set({
          creatorId: 'someone-else',
          occasion: 'Birthday',
          status: 'draft',
          publishedAt: null,
          completedAt: null,
          archivedAt: null,
        }),
      );
    });

    it('rejects a client directly setting status to published — that is Cloud-Function-only', async () => {
      await seedPublicExperience('cre_owner', 'exp_1');
      const creator = testEnv.authenticatedContext('cre_owner');
      await assertFails(
        creator.firestore().collection('puzzle_experiences').doc('exp_1').update({ status: 'published' }),
      );
    });

    it('rejects updates from anyone who is not the owning creator', async () => {
      await seedPublicExperience('cre_owner', 'exp_1');
      const intruder = testEnv.authenticatedContext('cre_intruder');
      await assertFails(
        intruder.firestore().collection('puzzle_experiences').doc('exp_1').update({ occasion: 'Hacked' }),
      );
    });
  });

  describe('puzzle_experiences_private (sensitive fields)', () => {
    it('allows the owning creator to read their own private doc', async () => {
      await seedPublicExperience('cre_owner', 'exp_1');
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('puzzle_experiences_private').doc('exp_1').set({ completionMessage: 'hi' });
      });

      const creator = testEnv.authenticatedContext('cre_owner');
      await assertSucceeds(creator.firestore().collection('puzzle_experiences_private').doc('exp_1').get());
    });

    it('denies a non-owning authenticated user from reading the private doc', async () => {
      await seedPublicExperience('cre_owner', 'exp_1');
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('puzzle_experiences_private').doc('exp_1').set({ completionMessage: 'hi' });
      });

      const intruder = testEnv.authenticatedContext('cre_intruder');
      await assertFails(intruder.firestore().collection('puzzle_experiences_private').doc('exp_1').get());
    });

    it('denies a fully unauthenticated client from reading the private doc — this is the whole point of the split', async () => {
      await seedPublicExperience('cre_owner', 'exp_1');
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('puzzle_experiences_private').doc('exp_1').set({ completionMessage: 'hi' });
      });

      const unauthed = testEnv.unauthenticatedContext();
      await assertFails(unauthed.firestore().collection('puzzle_experiences_private').doc('exp_1').get());
    });

    it('allows the owning creator to author their own private content', async () => {
      await seedPublicExperience('cre_owner', 'exp_1');
      const creator = testEnv.authenticatedContext('cre_owner');
      await assertSucceeds(
        creator.firestore().collection('puzzle_experiences_private').doc('exp_1').set({ completionMessage: 'Draft note' }),
      );
    });

    it('rejects a client ever setting shareTokenHash directly — only publishExperience (Admin SDK) may', async () => {
      await seedPublicExperience('cre_owner', 'exp_1');
      const creator = testEnv.authenticatedContext('cre_owner');
      await assertFails(
        creator
          .firestore()
          .collection('puzzle_experiences_private')
          .doc('exp_1')
          .set({ completionMessage: 'hi', shareTokenHash: 'attempted-forgery' }),
      );
    });
  });

  describe('puzzle_progress', () => {
    it('allows read only to a session whose experienceId claim matches the document', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('puzzle_progress').doc('exp_1').set({ status: 'in_progress' });
      });

      const scopedRecipient = testEnv.authenticatedContext('anon-1', { experienceId: 'exp_1' });
      await assertSucceeds(scopedRecipient.firestore().collection('puzzle_progress').doc('exp_1').get());

      const wrongScope = testEnv.authenticatedContext('anon-2', { experienceId: 'a-different-experience' });
      await assertFails(wrongScope.firestore().collection('puzzle_progress').doc('exp_1').get());
    });

    it('never allows a direct client write, even from a correctly-scoped session', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('puzzle_progress').doc('exp_1').set({ status: 'in_progress' });
      });

      const scopedRecipient = testEnv.authenticatedContext('anon-1', { experienceId: 'exp_1' });
      await assertFails(
        scopedRecipient.firestore().collection('puzzle_progress').doc('exp_1').update({ status: 'completed' }),
      );
    });

    it('denies an unauthenticated client entirely', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('puzzle_progress').doc('exp_1').set({ status: 'in_progress' });
      });
      const unauthed = testEnv.unauthenticatedContext();
      await assertFails(unauthed.firestore().collection('puzzle_progress').doc('exp_1').get());
    });
  });
});
