/**
 * Verifies the actual deployed Storage ruleset
 * (`lovedigitally-web/storage.rules`, symlinked into
 * `apps/puzzle-module/storage.rules`) against real client-permission
 * scenarios, using `@firebase/rules-unit-testing` — the Storage
 * counterpart of `security-rules.emulator-test.ts` (M5 Phase 6; this
 * file previously didn't exist, so Storage Rules had zero automated
 * coverage despite Firestore Rules having a dedicated suite since M2).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';

const RULES_PATH = resolve(__dirname, '../../../../../lovedigitally-web/storage.rules');
const TINY_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

describe('Storage security rules — puzzle_storage/*', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'lovedigitally-app',
      storage: { rules: readFileSync(RULES_PATH, 'utf8') },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  afterEach(async () => {
    await testEnv.clearStorage();
  });

  describe('shared locked-piece pattern art', () => {
    it('is readable by anyone, including a fully unauthenticated client', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.storage().ref('puzzle_storage/_shared/patterns/frame-outline.svg').put(TINY_JPEG);
      });

      const unauthed = testEnv.unauthenticatedContext();
      await assertSucceeds(unauthed.storage().ref('puzzle_storage/_shared/patterns/frame-outline.svg').getDownloadURL());
    });

    it('rejects any client write, including the creator whose experience it decorates', async () => {
      const creator = testEnv.authenticatedContext('storage_cre_owner');
      await assertFails(creator.storage().ref('puzzle_storage/_shared/patterns/frame-outline.svg').put(TINY_JPEG).then(() => undefined));
    });
  });

  describe('a creator\'s own reveal-image-original upload', () => {
    it('allows the owning creator to upload their own cropped original', async () => {
      const creator = testEnv.authenticatedContext('storage_cre_owner');
      await assertSucceeds(
        creator
          .storage()
          .ref('puzzle_storage/storage_cre_owner/exp_1/reveal-image-original.jpg')
          .put(TINY_JPEG, { contentType: 'image/jpeg' }).then(() => undefined),
      );
    });

    it('allows the owning creator to read back their own upload', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.storage().ref('puzzle_storage/storage_cre_owner/exp_1/reveal-image-original.jpg').put(TINY_JPEG, { contentType: 'image/jpeg' }).then(() => undefined);
      });

      const creator = testEnv.authenticatedContext('storage_cre_owner');
      await assertSucceeds(creator.storage().ref('puzzle_storage/storage_cre_owner/exp_1/reveal-image-original.jpg').getDownloadURL());
    });

    it('rejects a different authenticated user uploading into another creator\'s folder', async () => {
      const intruder = testEnv.authenticatedContext('storage_cre_intruder');
      await assertFails(
        intruder
          .storage()
          .ref('puzzle_storage/storage_cre_owner/exp_1/reveal-image-original.jpg')
          .put(TINY_JPEG, { contentType: 'image/jpeg' }).then(() => undefined),
      );
    });

    it('rejects a different authenticated user reading another creator\'s original upload', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.storage().ref('puzzle_storage/storage_cre_owner/exp_1/reveal-image-original.jpg').put(TINY_JPEG, { contentType: 'image/jpeg' }).then(() => undefined);
      });

      const intruder = testEnv.authenticatedContext('storage_cre_intruder');
      await assertFails(intruder.storage().ref('puzzle_storage/storage_cre_owner/exp_1/reveal-image-original.jpg').getDownloadURL());
    });

    it('rejects an unauthenticated client entirely, for both read and write', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.storage().ref('puzzle_storage/storage_cre_owner/exp_1/reveal-image-original.jpg').put(TINY_JPEG, { contentType: 'image/jpeg' }).then(() => undefined);
      });

      const unauthed = testEnv.unauthenticatedContext();
      await assertFails(unauthed.storage().ref('puzzle_storage/storage_cre_owner/exp_1/reveal-image-original.jpg').getDownloadURL());
      await assertFails(
        unauthed.storage().ref('puzzle_storage/storage_cre_owner/exp_2/reveal-image-original.jpg').put(TINY_JPEG, { contentType: 'image/jpeg' }).then(() => undefined),
      );
    });

    it('rejects a disallowed content type, even from the owning creator', async () => {
      const creator = testEnv.authenticatedContext('storage_cre_owner');
      await assertFails(
        creator
          .storage()
          .ref('puzzle_storage/storage_cre_owner/exp_1/reveal-image-original.jpg')
          .put(TINY_JPEG, { contentType: 'application/pdf' }).then(() => undefined),
      );
    });

    it('rejects a file over the 10MB size limit, even from the owning creator', async () => {
      const creator = testEnv.authenticatedContext('storage_cre_owner');
      const oversized = new Uint8Array(10 * 1024 * 1024 + 1);
      await assertFails(
        creator.storage().ref('puzzle_storage/storage_cre_owner/exp_1/reveal-image-original.jpg').put(oversized, { contentType: 'image/jpeg' }).then(() => undefined),
      );
    });

    it('rejects reading the server-generated full reveal image or a piece slice directly — those are signed-URL-only (Module Contract §8)', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.storage().ref('puzzle_storage/storage_cre_owner/exp_1/reveal-image.jpg').put(TINY_JPEG, { contentType: 'image/jpeg' }).then(() => undefined);
        await context.storage().ref('puzzle_storage/storage_cre_owner/exp_1/reveal-image-slice-q1.jpg').put(TINY_JPEG, { contentType: 'image/jpeg' }).then(() => undefined);
      });

      const creator = testEnv.authenticatedContext('storage_cre_owner');
      await assertFails(creator.storage().ref('puzzle_storage/storage_cre_owner/exp_1/reveal-image.jpg').getDownloadURL());
      await assertFails(creator.storage().ref('puzzle_storage/storage_cre_owner/exp_1/reveal-image-slice-q1.jpg').getDownloadURL());
    });
  });
});
