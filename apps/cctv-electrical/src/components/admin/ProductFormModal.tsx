import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { Category, Product } from '@/types';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { createProduct, updateProduct, type ProductInput } from '@/hooks/useProducts';

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  product?: Product | null;
}

const emptyForm: ProductInput = {
  name: '',
  categoryId: '',
  categoryName: '',
  description: '',
  price: 0,
  mrp: undefined,
  images: [],
  available: true,
  featured: false,
  specs: '',
};

export function ProductFormModal({ open, onClose, categories, product }: ProductFormModalProps) {
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        categoryId: product.categoryId,
        categoryName: product.categoryName,
        description: product.description,
        price: product.price,
        mrp: product.mrp,
        images: product.images,
        available: product.available,
        featured: product.featured,
        specs: product.specs ?? '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [product, open]);

  if (!open) return null;

  function setCategory(categoryId: string) {
    const cat = categories.find((c) => c.id === categoryId);
    setForm((f) => ({ ...f, categoryId, categoryName: cat?.name ?? '' }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim() || !form.categoryId || form.price < 0) {
      toast.error('Please fill in name, category and a valid price.');
      return;
    }

    setSaving(true);
    try {
      if (product) {
        await updateProduct(product.id, form);
        toast.success('Product updated');
      } else {
        await createProduct(form);
        toast.success('Product created');
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{product ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100" aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Photos</label>
            <ImageUploader images={form.images} onChange={(images) => setForm((f) => ({ ...f, images }))} folder="products" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="p-name">Product Name</label>
              <input id="p-name" className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={200} required />
            </div>

            <div>
              <label className="label" htmlFor="p-category">Category</label>
              <select id="p-category" className="input" value={form.categoryId} onChange={(e) => setCategory(e.target.value)} required>
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="p-price">Price (₹)</label>
              <input id="p-price" type="number" min={0} step={1} className="input" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} required />
            </div>

            <div>
              <label className="label" htmlFor="p-mrp">MRP (optional, ₹)</label>
              <input id="p-mrp" type="number" min={0} step={1} className="input" value={form.mrp ?? ''} onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value ? Number(e.target.value) : undefined }))} />
            </div>

            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.available} onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked }))} />
                Available
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} />
                Featured
              </label>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="p-desc">Description</label>
            <textarea id="p-desc" className="input" rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={3000} required />
          </div>

          <div>
            <label className="label" htmlFor="p-specs">Specifications (optional)</label>
            <textarea id="p-specs" className="input" rows={3} value={form.specs} onChange={(e) => setForm((f) => ({ ...f, specs: e.target.value }))} maxLength={2000} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : product ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
