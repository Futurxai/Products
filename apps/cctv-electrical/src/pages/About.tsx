import { Seo } from '@/components/Seo';
import { useSettings } from '@/hooks/useSettings';

export default function About() {
  const { settings } = useSettings();

  return (
    <div className="container-page py-8">
      <Seo title="About Us" description={`Learn more about ${settings.businessName}.`} path="/about" />

      <h1 className="text-2xl font-bold text-gray-900">About {settings.businessName}</h1>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="card p-6">
          <p className="text-gray-700">
            {settings.tagline} We specialize in CCTV camera sales, professional installation, and complete
            electrical services for homes and businesses. Our goal is simple: reliable security and electrical
            work, transparent pricing, and support you can reach on WhatsApp.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-gray-600">
            <li>✓ Genuine, warranty-backed CCTV equipment</li>
            <li>✓ Experienced, certified installation technicians</li>
            <li>✓ Transparent pricing, no hidden costs</li>
            <li>✓ Fast support over phone & WhatsApp</li>
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900">Contact Details</h2>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            {settings.phone && <li>📞 {settings.phone}</li>}
            {settings.email && <li>✉️ {settings.email}</li>}
            {settings.address && <li>📍 {settings.address}</li>}
            {settings.workingHours && <li>🕘 {settings.workingHours}</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
