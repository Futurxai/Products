import { Link } from 'react-router-dom';
import { useSettings } from '@/hooks/useSettings';
import { buildWhatsAppLink } from '@/utils/whatsapp';

export function Footer() {
  const { settings } = useSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="font-bold text-gray-900">{settings.businessName}</h3>
          <p className="mt-2 text-sm text-gray-600">{settings.tagline}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Quick Links</h4>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li><Link to="/products" className="hover:text-brand-700">Products</Link></li>
            <li><Link to="/services" className="hover:text-brand-700">Services</Link></li>
            <li><Link to="/about" className="hover:text-brand-700">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-brand-700">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Contact</h4>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            {settings.phone && <li>📞 {settings.phone}</li>}
            {settings.email && <li>✉️ {settings.email}</li>}
            {settings.address && <li>📍 {settings.address}</li>}
            {settings.workingHours && <li>🕘 {settings.workingHours}</li>}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Get in touch</h4>
          {settings.whatsappNumber ? (
            <a
              href={buildWhatsAppLink(settings.whatsappNumber, `Hi! I'd like to know more about ${settings.businessName}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp mt-3"
            >
              Chat on WhatsApp
            </a>
          ) : (
            <p className="mt-3 text-sm text-gray-500">Set a WhatsApp number in Admin → Settings.</p>
          )}
        </div>
      </div>

      <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-500">
        © {year} {settings.businessName}. All rights reserved.
      </div>
    </footer>
  );
}
