import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CartItem, Order, OrderCustomer, OrderStatus } from '@/types';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) })));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { orders, loading, error };
}

export async function submitOrder(
  items: CartItem[],
  customer: OrderCustomer,
): Promise<string> {
  const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const docRef = await addDoc(collection(db, 'orders'), {
    items: items.map((i) => ({
      productId: i.productId,
      name: i.name,
      price: i.price,
      qty: i.qty,
      image: i.image,
    })),
    customer,
    subtotal: total,
    total,
    status: 'pending' satisfies OrderStatus,
    createdAt: Date.now(),
    serverCreatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  await updateDoc(doc(db, 'orders', id), { status });
}
