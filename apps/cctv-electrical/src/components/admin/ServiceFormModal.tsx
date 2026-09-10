import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { Service } from '@/types';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { createService, updateService, type ServiceInput } from '@/hooks/useServices';

interface ServiceFormModalProps {
  open: boolean;
  onClose: () => void;
  service?: Service | null;
  nextOrder: number;
}

const emptyForm: ServiceInput = { title: '', description: '', images: [], order: 0 };

export function ServiceFormModal({ open, onClose, service, nextOrder }: ServiceFormModalProps) {
  const [form, setForm] = useState<ServiceInput>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (service) {
      setForm({ title: service.title, description: service.description, images: service.images, order: service.order });
    } else {
      setForm({ ...emptyForm, order: nextOrder });
    }
  }, [service, open, nextOrder]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Please enter a service title.');
      return;
    }
    setSaving(true);
    try {
      if (service) {
        await updateService(service.id, form);
        toast.success('Service updated');
      } else {
        await createService(form);
        toast.success('Service added');
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save service');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{service ? 'Edit Service' : 'Add Service'}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100" aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Photos</label>
            <ImageUploader images={form.images} onChange={(images) => setForm((f) => ({ ...f, images }))} folder="services" max={4} />
          </div>

          <div>
            <label className="label" htmlFor="s-title">Service Title</label>
            <input id="s-title" className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} maxLength={200} required />
          </div>

          <div>
            <label className="label" htmlFor="s-desc">Description</label>
            <textarea id="s-desc" className="input" rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={2000} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : service ? 'Save Changes' : 'Create Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
