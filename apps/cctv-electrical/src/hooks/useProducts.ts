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
import type { Product } from '@/types';
import { slugify } from '@/utils/format';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setProducts(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) })),
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

  return { products, loading, error };
}

export type ProductInput = {
  name: string;
  categoryId: string;
  categoryName: string;
  description: string;
  price: number;
  mrp?: number;
  images: string[];
  available: boolean;
  featured: boolean;
  specs?: string;
};

export async function createProduct(input: ProductInput) {
  const now = Date.now();
  await addDoc(collection(db, 'products'), {
    ...input,
    slug: slugify(input.name),
    createdAt: now,
    updatedAt: now,
    serverCreatedAt: serverTimestamp(),
  });
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  const payload: Record<string, unknown> = { ...input, updatedAt: Date.now() };
  if (input.name) payload.slug = slugify(input.name);
  await updateDoc(doc(db, 'products', id), payload);
}

export async function toggleProductAvailability(id: string, available: boolean) {
  await updateDoc(doc(db, 'products', id), { available, updatedAt: Date.now() });
}

export async function deleteProduct(id: string) {
  await deleteDoc(doc(db, 'products', id));
}
