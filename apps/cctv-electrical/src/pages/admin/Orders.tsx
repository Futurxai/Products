import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { useOrders, updateOrderStatus } from '@/hooks/useOrders';
import { formatPrice } from '@/utils/format';
import type { OrderStatus } from '@/types';

const STATUSES: OrderStatus[] = ['pending', 'confirmed', 'completed', 'cancelled'];

const statusStyles: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-200 text-gray-600',
};

export default function AdminOrders() {
  const { orders, loading } = useOrders();
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === 'all' ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );

  async function handleStatusChange(id: string, status: OrderStatus) {
    try {
      await updateOrderStatus(id, status);
      toast.success('Order status updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Orders</h1>
        <div className="flex flex-wrap gap-2">
          {(['all', ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                filter === s ? 'bg-brand-700 text-white' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <FullPageSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState title="No orders" description="Orders placed by customers will appear here." />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div key={order.id} className="card overflow-hidden">
              <button
                className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left"
                onClick={() => setExpanded((e) => (e === order.id ? null : order.id))}
              >
                <div>
                  <p className="font-semibold text-gray-900">{order.customer.name}</p>
                  <p className="text-sm text-gray-500">{order.customer.phone} · {new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900">{formatPrice(order.total)}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[order.status]}`}>
                    {order.status}
                  </span>
                </div>
              </button>

              {expanded === order.id && (
                <div className="border-t border-gray-100 p-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Address:</span> {order.customer.address}
                  </p>
                  {order.customer.notes && (
                    <p className="mt-1 text-sm text-gray-600">
                      <span className="font-medium text-gray-800">Notes:</span> {order.customer.notes}
                    </p>
                  )}

                  <ul className="mt-4 space-y-1 text-sm">
                    {order.items.map((item) => (
                      <li key={item.productId} className="flex justify-between">
                        <span className="text-gray-600">{item.name} × {item.qty}</span>
                        <span className="font-medium text-gray-900">{formatPrice(item.price * item.qty)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700" htmlFor={`status-${order.id}`}>Status:</label>
                    <select
                      id={`status-${order.id}`}
                      className="input w-auto"
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s} className="capitalize">{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
