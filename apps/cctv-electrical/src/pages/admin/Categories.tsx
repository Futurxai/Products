import { useState } from 'react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { useCategories, createCategory, updateCategory, deleteCategory } from '@/hooks/useCategories';
import type { Category } from '@/types';

export default function AdminCategories() {
  const { categories, loading } = useCategories();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createCategory(name.trim(), categories.length);
      setName('');
      toast.success('Category added');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add category');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !editName.trim()) return;
    try {
      await updateCategory(editing.id, { name: editName.trim() });
      toast.success('Category updated');
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await deleteCategory(pendingDelete.id);
      toast.success('Category deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <AdminLayout>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Categories</h1>

      <form onSubmit={handleCreate} className="card mb-6 flex gap-3 p-4">
        <input
          className="input"
          placeholder="New category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
        />
        <button className="btn-primary whitespace-nowrap" disabled={saving}>
          + Add
        </button>
      </form>

      {loading ? (
        <FullPageSpinner />
      ) : categories.length === 0 ? (
        <EmptyState title="No categories yet" description="Add a category to start organizing products." />
      ) : (
        <div className="card divide-y divide-gray-100">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-4">
              {editing?.id === c.id ? (
                <form onSubmit={handleUpdate} className="flex flex-1 gap-2">
                  <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={120} autoFocus />
                  <button type="submit" className="btn-primary">Save</button>
                  <button type="button" className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                </form>
              ) : (
                <>
                  <span className="font-medium text-gray-900">{c.name}</span>
                  <div className="space-x-3">
                    <button
                      className="text-sm font-medium text-brand-700 hover:underline"
                      onClick={() => { setEditing(c); setEditName(c.name); }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-sm font-medium text-red-600 hover:underline"
                      onClick={() => setPendingDelete(c)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete category?"
        description={`Products in "${pendingDelete?.name}" will keep their category label but it will no longer appear in filters.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </AdminLayout>
  );
}
