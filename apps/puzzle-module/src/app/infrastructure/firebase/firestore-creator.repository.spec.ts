import { Timestamp } from '@angular/fire/firestore';

import { Creator } from '@domain/models/creator.model';

import { fromDoc, toDoc, toUpdateFields } from './firestore-creator.repository';

describe('firestore-creator.repository mapping', () => {
  const creator: Creator = {
    creatorId: 'uid_1',
    displayName: 'Vikram Rao',
    email: 'vikram.rao@example.com',
    phone: '+91-98450-11223',
    avatarUrl: 'https://i.pravatar.cc/150?img=12',
    signupMethod: 'email',
    createdAt: new Date('2026-01-04T09:12:00+05:30'),
  };

  it('toDoc converts createdAt to a Firestore Timestamp and drops creatorId (it is the doc id, not a field)', () => {
    const docData = toDoc(creator);

    expect(docData.createdAt instanceof Timestamp).toBeTrue();
    expect(docData.createdAt.toDate().getTime()).toBe(creator.createdAt.getTime());
    expect(docData.displayName).toBe(creator.displayName);
    expect((docData as unknown as { creatorId?: string }).creatorId).toBeUndefined();
  });

  it('fromDoc round-trips toDoc output back into an equivalent Creator', () => {
    const docData = toDoc(creator);
    const roundTripped = fromDoc(creator.creatorId, docData);

    expect(roundTripped).toEqual(creator);
  });

  it('toUpdateFields only includes fields explicitly present in the partial, even falsy ones', () => {
    expect(toUpdateFields({ phone: null })).toEqual({ phone: null });
    expect(toUpdateFields({ displayName: 'New Name' })).toEqual({ displayName: 'New Name' });
    expect(toUpdateFields({})).toEqual({});
  });

  it('toUpdateFields never emits creatorId or createdAt — those are not client-updatable', () => {
    const fields = toUpdateFields({ displayName: 'New Name', creatorId: 'uid_1', createdAt: new Date() });

    expect(fields['creatorId']).toBeUndefined();
    expect(fields['createdAt']).toBeUndefined();
    expect(fields['displayName']).toBe('New Name');
  });
});
