import testEnvFactory from 'firebase-functions-test';
import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';

const test = testEnvFactory();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { defineCreatorCallable, definePublicCallable, defineRecipientCallable } = require('./define-callable');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ExperienceNotFoundError } = require('../domain/errors/domain-errors');

const echoSchema = z.object({ value: z.string().min(1) });

describe('defineCreatorCallable', () => {
  afterAll(() => test.cleanup());

  it('rejects an unauthenticated request with unauthenticated', async () => {
    const fn = defineCreatorCallable({
      functionName: 'test.creator',
      schema: echoSchema,
      handler: async (input: { value: string }) => ({ echoed: input.value }),
    });
    const wrapped = test.wrap(fn);

    await expectAsync(wrapped({ data: { value: 'x' } })).toBeRejectedWith(
      jasmine.objectContaining({ code: 'unauthenticated' } as Partial<HttpsError>),
    );
  });

  it('rejects a request that fails schema validation with invalid-argument', async () => {
    const fn = defineCreatorCallable({
      functionName: 'test.creator',
      schema: echoSchema,
      handler: async (input: { value: string }) => ({ echoed: input.value }),
    });
    const wrapped = test.wrap(fn);

    await expectAsync(
      wrapped({ data: {}, auth: { uid: 'u1', token: {} } }),
    ).toBeRejectedWith(jasmine.objectContaining({ code: 'invalid-argument' } as Partial<HttpsError>));
  });

  it('resolves ok:true with the handler result on success', async () => {
    const fn = defineCreatorCallable({
      functionName: 'test.creator',
      schema: echoSchema,
      handler: async (input: { value: string }) => ({ echoed: input.value }),
    });
    const wrapped = test.wrap(fn);

    const result = await wrapped({ data: { value: 'hello' }, auth: { uid: 'u1', token: {} } });
    expect(result).toEqual({ ok: true, echoed: 'hello' });
  });

  it('resolves ok:false with the mapped domain error code, not a rejection, for a thrown DomainError', async () => {
    const fn = defineCreatorCallable({
      functionName: 'test.creator',
      schema: echoSchema,
      handler: async () => {
        throw new ExperienceNotFoundError('exp_missing');
      },
    });
    const wrapped = test.wrap(fn);

    const result = await wrapped({ data: { value: 'x' }, auth: { uid: 'u1', token: {} } });
    expect(result).toEqual(
      jasmine.objectContaining({ ok: false, error: 'EXPERIENCE_NOT_FOUND' }),
    );
  });

  it('lets a non-domain error propagate as a rejection (an internal/unexpected failure)', async () => {
    const fn = defineCreatorCallable({
      functionName: 'test.creator',
      schema: echoSchema,
      handler: async () => {
        throw new Error('boom — a genuine bug, not a business rule');
      },
    });
    const wrapped = test.wrap(fn);

    await expectAsync(wrapped({ data: { value: 'x' }, auth: { uid: 'u1', token: {} } })).toBeRejected();
  });
});

describe('definePublicCallable', () => {
  it('runs without any auth at all', async () => {
    const fn = definePublicCallable({
      functionName: 'test.public',
      schema: echoSchema,
      handler: async (input: { value: string }) => ({ echoed: input.value }),
    });
    const wrapped = test.wrap(fn);

    const result = await wrapped({ data: { value: 'hi' } });
    expect(result).toEqual({ ok: true, echoed: 'hi' });
  });
});

describe('defineRecipientCallable', () => {
  it('rejects a session with no experienceId claim', async () => {
    const fn = defineRecipientCallable({
      functionName: 'test.recipient',
      schema: echoSchema,
      handler: async (input: { value: string }, experienceId: string) => ({ echoed: input.value, experienceId }),
    });
    const wrapped = test.wrap(fn);

    await expectAsync(
      wrapped({ data: { value: 'x' }, auth: { uid: 'anon-1', token: {} } }),
    ).toBeRejectedWith(jasmine.objectContaining({ code: 'permission-denied' } as Partial<HttpsError>));
  });

  it('passes the experienceId claim through to the handler', async () => {
    const fn = defineRecipientCallable({
      functionName: 'test.recipient',
      schema: echoSchema,
      handler: async (input: { value: string }, experienceId: string) => ({ echoed: input.value, experienceId }),
    });
    const wrapped = test.wrap(fn);

    const result = await wrapped({
      data: { value: 'x' },
      auth: { uid: 'anon-1', token: { experienceId: 'exp_test' } },
    });
    expect(result).toEqual({ ok: true, echoed: 'x', experienceId: 'exp_test' });
  });
});
