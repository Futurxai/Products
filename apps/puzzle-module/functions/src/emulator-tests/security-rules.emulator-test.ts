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

  describe('puzzle_events (analytics log — M5 Phase 6, previously untested against the real emulator)', () => {
    it('allows the owning creator to read their own experience\'s events', async () => {
      await seedPublicExperience('cre_owner', 'exp_1');
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('puzzle_events').doc('evt_1').set({ experienceId: 'exp_1', eventName: 'recipient.link_opened' });
      });

      const creator = testEnv.authenticatedContext('cre_owner');
      await assertSucceeds(creator.firestore().collection('puzzle_events').doc('evt_1').get());
    });

    it('denies a non-owning authenticated user from reading another creator\'s events', async () => {
      await seedPublicExperience('cre_owner', 'exp_1');
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('puzzle_events').doc('evt_1').set({ experienceId: 'exp_1', eventName: 'recipient.link_opened' });
      });

      const intruder = testEnv.authenticatedContext('cre_intruder');
      await assertFails(intruder.firestore().collection('puzzle_events').doc('evt_1').get());
    });

    it('denies an unauthenticated client entirely', async () => {
      await seedPublicExperience('cre_owner', 'exp_1');
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('puzzle_events').doc('evt_1').set({ experienceId: 'exp_1', eventName: 'recipient.link_opened' });
      });

      const unauthed = testEnv.unauthenticatedContext();
      await assertFails(unauthed.firestore().collection('puzzle_events').doc('evt_1').get());
    });

    it('never allows a direct client write — puzzle_events is Cloud-Functions-only', async () => {
      await seedPublicExperience('cre_owner', 'exp_1');
      const creator = testEnv.authenticatedContext('cre_owner');
      await assertFails(
        creator.firestore().collection('puzzle_events').doc('evt_forged').set({ experienceId: 'exp_1', eventName: 'puzzle.completed' }),
      );
    });
  });

  describe('puzzle_creators (M5 Phase 6, previously untested against the real emulator)', () => {
    it('allows a creator to read and write only their own profile document', async () => {
      // `context.firestore()` re-runs `useEmulator(...)` every call, which
      // throws on an already-started instance — capture it once per
      // context and reuse that reference, never call `.firestore()` a
      // second time on the same context.
      const creatorDb = testEnv.authenticatedContext('cre_owner').firestore();
      await assertSucceeds(creatorDb.collection('puzzle_creators').doc('cre_owner').set({ displayName: 'Ananya' }));
      await assertSucceeds(creatorDb.collection('puzzle_creators').doc('cre_owner').get());
    });

    it('denies reading or writing someone else\'s creator profile', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('puzzle_creators').doc('cre_owner').set({ displayName: 'Ananya' });
      });

      const intruderDb = testEnv.authenticatedContext('cre_intruder').firestore();
      await assertFails(intruderDb.collection('puzzle_creators').doc('cre_owner').get());
      await assertFails(intruderDb.collection('puzzle_creators').doc('cre_owner').set({ displayName: 'Hacked' }));
    });
  });

  describe('Business Rule #10 — editing is blocked once a recipient has started (M5 Phase 6, previously untested against the real emulator)', () => {
    it('allows the owning creator to update a draft experience with no progress document yet', async () => {
      await seedPublicExperience('cre_owner', 'exp_1');
      const creator = testEnv.authenticatedContext('cre_owner');
      await assertSucceeds(creator.firestore().collection('puzzle_experiences').doc('exp_1').update({ occasion: 'Updated' }));
    });

    it('rejects a non-status-field update once a puzzle_progress document exists for the experience, even from the owning creator', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.collection('puzzle_experiences').doc('exp_1').set({
          creatorId: 'cre_owner',
          occasion: 'Anniversary',
          status: 'published',
          publishedAt: new Date(),
          completedAt: null,
          archivedAt: null,
        });
        await db.collection('puzzle_progress').doc('exp_1').set({ status: 'in_progress' });
      });

      const creator = testEnv.authenticatedContext('cre_owner');
      await assertFails(creator.firestore().collection('puzzle_experiences').doc('exp_1').update({ occasion: 'Trying to sneak an edit in' }));
    });
  });
});
