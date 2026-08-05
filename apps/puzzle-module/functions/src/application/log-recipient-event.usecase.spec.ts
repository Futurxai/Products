import { logRecipientEvent } from './log-recipient-event.usecase';
import { createFakeEventLogStore, createFakeLogger } from './testing/fakes';

describe('logRecipientEvent use-case', () => {
  it('logs the given allowlisted event against the caller\'s own experienceId', async () => {
    const eventLogStore = createFakeEventLogStore();

    const result = await logRecipientEvent(
      { eventLogStore, logger: createFakeLogger() },
      { experienceId: 'exp_1', eventName: 'recipient.welcome_viewed' },
    );

    expect(result).toEqual({});
    expect(eventLogStore.events).toEqual([
      { eventName: 'recipient.welcome_viewed', experienceId: 'exp_1', moduleType: 'puzzle', actorRole: 'recipient', payload: {} },
    ]);
  });

  it('logs celebration.viewed the same way', async () => {
    const eventLogStore = createFakeEventLogStore();

    await logRecipientEvent({ eventLogStore, logger: createFakeLogger() }, { experienceId: 'exp_1', eventName: 'celebration.viewed' });

    expect(eventLogStore.events[0].eventName).toBe('celebration.viewed');
  });

  it('never fails the request even if logging fails — analytics is best-effort', async () => {
    const eventLogStore = { logEvent: () => Promise.reject(new Error('firestore unavailable')) };

    await expectAsync(
      logRecipientEvent({ eventLogStore, logger: createFakeLogger() }, { experienceId: 'exp_1', eventName: 'celebration.viewed' }),
    ).toBeResolved();
  });
});
