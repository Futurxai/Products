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
import type { Category } from '@/types';
import { slugify } from '@/utils/format';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setCategories(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) })),
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

  return { categories, loading, error };
}

export async function createCategory(name: string, order: number) {
  await addDoc(collection(db, 'categories'), {
    name,
    slug: slugify(name),
    order,
    createdAt: Date.now(),
    serverCreatedAt: serverTimestamp(),
  });
}

export async function updateCategory(id: string, data: Partial<Pick<Category, 'name' | 'order'>>) {
  const payload: Record<string, unknown> = { ...data };
  if (data.name) payload.slug = slugify(data.name);
  await updateDoc(doc(db, 'categories', id), payload);
}

export async function deleteCategory(id: string) {
  await deleteDoc(doc(db, 'categories', id));
}
