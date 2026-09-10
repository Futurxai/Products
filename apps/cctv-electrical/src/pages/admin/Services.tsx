import { useState } from 'react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ServiceFormModal } from '@/components/admin/ServiceFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { useServices, deleteService } from '@/hooks/useServices';
import type { Service } from '@/types';

export default function AdminServices() {
  const { services, loading } = useServices();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Service | null>(null);

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await deleteService(pendingDelete.id);
      toast.success('Service deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Services</h1>
        <button className="btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
          + Add Service
        </button>
      </div>

      {loading ? (
        <FullPageSpinner />
      ) : services.length === 0 ? (
        <EmptyState title="No services yet" description="Add installation, maintenance or wiring services you offer." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div key={s.id} className="card overflow-hidden">
              {s.images[0] && <img src={s.images[0]} alt="" className="h-32 w-full object-cover" />}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">{s.description}</p>
                <div className="mt-3 space-x-3">
                  <button className="text-sm font-medium text-brand-700 hover:underline" onClick={() => { setEditing(s); setModalOpen(true); }}>Edit</button>
                  <button className="text-sm font-medium text-red-600 hover:underline" onClick={() => setPendingDelete(s)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ServiceFormModal open={modalOpen} onClose={() => setModalOpen(false)} service={editing} nextOrder={services.length} />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete service?"
        description={`This will permanently remove "${pendingDelete?.title}".`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </AdminLayout>
  );
}
