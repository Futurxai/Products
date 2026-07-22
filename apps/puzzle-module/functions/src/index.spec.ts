import testEnvFactory from 'firebase-functions-test';

const test = testEnvFactory();

describe('healthCheck', () => {
  afterAll(() => {
    test.cleanup();
  });

  it('reports ok:true with the puzzle-module codebase identity', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { healthCheck } = require('./index');
    const wrapped = test.wrap(healthCheck);
    const result = await wrapped({});

    expect(result.ok).toBeTrue();
    expect(result.codebase).toBe('puzzle-module');
    expect(result.milestone).toBe('M2');
    expect(typeof result.timestamp).toBe('string');
  });
});
