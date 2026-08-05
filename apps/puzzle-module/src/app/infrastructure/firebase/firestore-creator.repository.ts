import { Injectable, inject } from '@angular/core';
import { Firestore, Timestamp, UpdateData, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';

import { CreatorRepositoryPort } from '@domain/ports/creator-repository.port';
import { Creator, SignupMethod } from '@domain/models/creator.model';

const COLLECTION = 'puzzle_creators';

/** The on-the-wire shape at `puzzle_creators/{creatorId}` — `createdAt` is a Firestore `Timestamp`, never a plain `Date`. */
interface CreatorDoc {
  displayName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  signupMethod: SignupMethod;
  createdAt: Timestamp;
}

/** `CreatorRepositoryPort` implemented against `@angular/fire/firestore`. See `lovedigitally-web/firestore.rules` for the owner-only access rule this collection is governed by. */
@Injectable({ providedIn: 'root' })
export class FirestoreCreatorRepository implements CreatorRepositoryPort {
  private readonly firestore = inject(Firestore);

  async getById(creatorId: string): Promise<Creator | null> {
    const snapshot = await getDoc(doc(this.firestore, COLLECTION, creatorId));
    if (!snapshot.exists()) {
      return null;
    }
    return fromDoc(creatorId, snapshot.data() as CreatorDoc);
  }

  async create(creator: Creator): Promise<void> {
    await setDoc(doc(this.firestore, COLLECTION, creator.creatorId), toDoc(creator));
  }

  async update(creatorId: string, changes: Partial<Creator>): Promise<void> {
    await updateDoc(doc(this.firestore, COLLECTION, creatorId), toUpdateFields(changes) as UpdateData<CreatorDoc>);
  }
}

export function toDoc(creator: Creator): CreatorDoc {
  return {
    displayName: creator.displayName,
    email: creator.email,
    phone: creator.phone,
    avatarUrl: creator.avatarUrl,
    signupMethod: creator.signupMethod,
    createdAt: Timestamp.fromDate(creator.createdAt),
  };
}

export function fromDoc(creatorId: string, docData: CreatorDoc): Creator {
  return {
    creatorId,
    displayName: docData.displayName,
    email: docData.email,
    phone: docData.phone,
    avatarUrl: docData.avatarUrl,
    signupMethod: docData.signupMethod,
    createdAt: docData.createdAt.toDate(),
  };
}

/** `creatorId` and `createdAt` are never client-updatable (the security rules agree — see the `puzzle_creators` match block); this only ever needs to touch the handful of profile fields a Creator can edit. */
export function toUpdateFields(changes: Partial<Creator>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  if (changes.displayName !== undefined) fields['displayName'] = changes.displayName;
  if (changes.email !== undefined) fields['email'] = changes.email;
  if (changes.phone !== undefined) fields['phone'] = changes.phone;
  if (changes.avatarUrl !== undefined) fields['avatarUrl'] = changes.avatarUrl;
  if (changes.signupMethod !== undefined) fields['signupMethod'] = changes.signupMethod;
  return fields;
}
