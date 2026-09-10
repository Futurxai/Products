import { useState } from 'react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ProductFormModal } from '@/components/admin/ProductFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { useProducts, deleteProduct, toggleProductAvailability } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { formatPrice } from '@/utils/format';
import type { Product } from '@/types';

export default function AdminProducts() {
  const { products, loading } = useProducts();
  const { categories } = useCategories();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setModalOpen(true);
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await deleteProduct(pendingDelete.id);
      toast.success('Product deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Products</h1>
        <button
          className="btn-primary"
          onClick={openCreate}
          disabled={categories.length === 0}
          title={categories.length === 0 ? 'Add a category first' : undefined}
        >
          + Add Product
        </button>
      </div>

      {categories.length === 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Create at least one category before adding products.
        </p>
      )}

      {loading ? (
        <FullPageSpinner />
      ) : products.length === 0 ? (
        <EmptyState title="No products yet" description="Add your first product to get started." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-gray-100 text-gray-500">
              <tr>
                <th className="p-4">Product</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Available</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="flex items-center gap-3 p-4">
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                      {p.images[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <span className="line-clamp-1 font-medium text-gray-900">{p.name}</span>
                  </td>
                  <td className="p-4 text-gray-600">{p.categoryName}</td>
                  <td className="p-4 text-gray-600">{formatPrice(p.price)}</td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleProductAvailability(p.id, !p.available)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        p.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {p.available ? 'In Stock' : 'Out of Stock'}
                    </button>
                  </td>
                  <td className="space-x-3 p-4">
                    <button className="font-medium text-brand-700 hover:underline" onClick={() => openEdit(p)}>Edit</button>
                    <button className="font-medium text-red-600 hover:underline" onClick={() => setPendingDelete(p)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProductFormModal open={modalOpen} onClose={() => setModalOpen(false)} categories={categories} product={editing} />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete product?"
        description={`This will permanently remove "${pendingDelete?.name}".`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </AdminLayout>
  );
}
