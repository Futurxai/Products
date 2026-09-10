import { Seo } from '@/components/Seo';
import { useSettings } from '@/hooks/useSettings';
import { buildWhatsAppLink } from '@/utils/whatsapp';

export default function Contact() {
  const { settings } = useSettings();

  return (
    <div className="container-page py-8">
      <Seo title="Contact Us" description={`Get in touch with ${settings.businessName}.`} path="/contact" />

      <h1 className="text-2xl font-bold text-gray-900">Contact Us</h1>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="card p-6">
          <ul className="space-y-3 text-gray-700">
            {settings.phone && <li>📞 <a href={`tel:${settings.phone}`} className="hover:text-brand-700">{settings.phone}</a></li>}
            {settings.email && <li>✉️ <a href={`mailto:${settings.email}`} className="hover:text-brand-700">{settings.email}</a></li>}
            {settings.address && <li>📍 {settings.address}</li>}
            {settings.workingHours && <li>🕘 {settings.workingHours}</li>}
          </ul>

          {settings.whatsappNumber && (
            <a
              href={buildWhatsAppLink(settings.whatsappNumber, `Hi! I'd like to get in touch with ${settings.businessName}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp mt-6"
            >
              Chat on WhatsApp
            </a>
          )}

          <div className="mt-4 flex gap-3">
            {settings.facebookUrl && (
              <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">Facebook</a>
            )}
            {settings.instagramUrl && (
              <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">Instagram</a>
            )}
          </div>
        </div>

        {settings.mapEmbedUrl && (
          <div className="card overflow-hidden">
            <iframe
              src={settings.mapEmbedUrl}
              title="Location map"
              className="h-full min-h-[320px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
      </div>
    </div>
  );
}
