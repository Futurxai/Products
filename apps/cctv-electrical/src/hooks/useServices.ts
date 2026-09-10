import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Service } from '@/types';

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setServices(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Service, 'id'>) })),
        );
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { services, loading, error };
}

export type ServiceInput = {
  title: string;
  description: string;
  images: string[];
  order: number;
};

export async function createService(input: ServiceInput) {
  await addDoc(collection(db, 'services'), {
    ...input,
    createdAt: Date.now(),
    serverCreatedAt: serverTimestamp(),
  });
}

export async function updateService(id: string, input: Partial<ServiceInput>) {
  await updateDoc(doc(db, 'services', id), input);
}

export async function deleteService(id: string) {
  await deleteDoc(doc(db, 'services', id));
}
