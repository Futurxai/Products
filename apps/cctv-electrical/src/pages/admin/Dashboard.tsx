import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { useCategories } from '@/hooks/useCategories';
import { formatPrice } from '@/utils/format';

export default function AdminDashboard() {
  const { products } = useProducts();
  const { orders } = useOrders();
  const { categories } = useCategories();

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const outOfStock = products.filter((p) => !p.available);

  const stats = [
    { label: 'Products', value: products.length, to: '/admin/products' },
    { label: 'Categories', value: categories.length, to: '/admin/categories' },
    { label: 'Pending Orders', value: pendingOrders.length, to: '/admin/orders' },
    { label: 'Out of Stock', value: outOfStock.length, to: '/admin/products' },
  ];

  return (
    <AdminLayout>
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="card p-5 hover:shadow-md">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="mt-1 text-sm text-gray-500">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <Link to="/admin/orders" className="text-sm font-medium text-brand-700 hover:underline">View all →</Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-500">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.id}>
                    <td className="py-2 pr-4">{o.customer.name}</td>
                    <td className="py-2 pr-4">{formatPrice(o.total)}</td>
                    <td className="py-2 pr-4 capitalize">{o.status}</td>
                    <td className="py-2 text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
