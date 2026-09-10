import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { useSettings, saveSettings } from '@/hooks/useSettings';
import type { BusinessSettings } from '@/types';

export default function AdminSettings() {
  const { settings, loading } = useSettings();
  const [form, setForm] = useState<BusinessSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  function field<K extends keyof BusinessSettings>(key: K) {
    return {
      value: form[key] ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(form);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <AdminLayout>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Business Settings</h1>

      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-5 p-6">
        <div>
          <label className="label">Logo</label>
          <ImageUploader
            images={form.logoUrl ? [form.logoUrl] : []}
            onChange={(imgs) => setForm((f) => ({ ...f, logoUrl: imgs[0] ?? '' }))}
            folder="branding"
            max={1}
          />
        </div>

        <div>
          <label className="label">Hero Image (homepage banner)</label>
          <ImageUploader
            images={form.heroImageUrl ? [form.heroImageUrl] : []}
            onChange={(imgs) => setForm((f) => ({ ...f, heroImageUrl: imgs[0] ?? '' }))}
            folder="branding"
            max={1}
          />
        </div>

        <div>
          <label className="label" htmlFor="businessName">Business Name</label>
          <input id="businessName" className="input" {...field('businessName')} required maxLength={150} />
        </div>

        <div>
          <label className="label" htmlFor="tagline">Tagline</label>
          <input id="tagline" className="input" {...field('tagline')} maxLength={200} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" className="input" {...field('phone')} maxLength={20} />
          </div>
          <div>
            <label className="label" htmlFor="whatsappNumber">WhatsApp Number</label>
            <input id="whatsappNumber" className="input" placeholder="919876543210" {...field('whatsappNumber')} maxLength={20} />
            <p className="mt-1 text-xs text-gray-500">Include country code, digits only.</p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" {...field('email')} maxLength={150} />
        </div>

        <div>
          <label className="label" htmlFor="address">Address</label>
          <textarea id="address" className="input" rows={2} {...field('address')} maxLength={300} />
        </div>

        <div>
          <label className="label" htmlFor="workingHours">Working Hours</label>
          <input id="workingHours" className="input" {...field('workingHours')} maxLength={150} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="facebookUrl">Facebook URL</label>
            <input id="facebookUrl" className="input" {...field('facebookUrl')} maxLength={300} />
          </div>
          <div>
            <label className="label" htmlFor="instagramUrl">Instagram URL</label>
            <input id="instagramUrl" className="input" {...field('instagramUrl')} maxLength={300} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="mapEmbedUrl">Google Maps Embed URL (optional)</label>
          <input id="mapEmbedUrl" className="input" {...field('mapEmbedUrl')} maxLength={500} />
        </div>

        <div>
          <label className="label" htmlFor="seoDescription">SEO Description</label>
          <textarea id="seoDescription" className="input" rows={2} {...field('seoDescription')} maxLength={300} />
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </AdminLayout>
  );
}
