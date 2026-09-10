import { Seo } from '@/components/Seo';
import { useServices } from '@/hooks/useServices';
import { useSettings } from '@/hooks/useSettings';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { buildWhatsAppLink } from '@/utils/whatsapp';

export default function Services() {
  const { services, loading } = useServices();
  const { settings } = useSettings();

  return (
    <div className="container-page py-8">
      <Seo
        title="CCTV & Electrical Installation Services"
        description="Professional CCTV installation, electrical wiring and maintenance services."
        path="/services"
      />

      <h1 className="text-2xl font-bold text-gray-900">Our Services</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        From CCTV installation to full electrical wiring, our certified technicians deliver reliable, professional work.
      </p>

      <div className="mt-8">
        {loading ? (
          <FullPageSpinner />
        ) : services.length === 0 ? (
          <EmptyState title="Services coming soon" description="Check back shortly or contact us for a custom quote." />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <div key={s.id} className="card flex flex-col overflow-hidden">
                {s.images[0] && <img src={s.images[0]} alt={s.title} className="h-44 w-full object-cover" />}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-semibold text-gray-900">{s.title}</h3>
                  <p className="mt-2 flex-1 whitespace-pre-line text-sm text-gray-600">{s.description}</p>
                  {settings.whatsappNumber && (
                    <a
                      href={buildWhatsAppLink(
                        settings.whatsappNumber,
                        `Hi! I'd like to enquire about your "${s.title}" service.`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-whatsapp mt-4"
                    >
                      Enquire on WhatsApp
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
