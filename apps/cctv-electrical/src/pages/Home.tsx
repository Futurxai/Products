import { Link } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { useProducts } from '@/hooks/useProducts';
import { useServices } from '@/hooks/useServices';
import { useSettings } from '@/hooks/useSettings';
import { ProductGrid } from '@/components/products/ProductGrid';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { buildWhatsAppLink } from '@/utils/whatsapp';

export default function Home() {
  const { products, loading } = useProducts();
  const { services } = useServices();
  const { settings } = useSettings();

  const featured = products.filter((p) => p.featured && p.available).slice(0, 8);
  const shown = featured.length > 0 ? featured : products.filter((p) => p.available).slice(0, 8);

  return (
    <>
      <Seo
        title={`${settings.businessName} | CCTV Cameras & Electrical Installation`}
        description={settings.seoDescription || settings.tagline}
        path="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: settings.businessName,
          telephone: settings.phone || undefined,
          email: settings.email || undefined,
          address: settings.address || undefined,
        }}
      />

      <section className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-white">
        <div className="container-page grid gap-10 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">
              {settings.businessName}
            </h1>
            <p className="mt-4 max-w-md text-brand-100">{settings.tagline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products" className="btn-accent">
                Shop Products
              </Link>
              <Link to="/services" className="btn bg-white text-brand-800 hover:bg-brand-50">
                Our Services
              </Link>
              {settings.whatsappNumber && (
                <a
                  href={buildWhatsAppLink(settings.whatsappNumber, `Hi! I'd like a CCTV/electrical consultation.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp"
                >
                  WhatsApp Us
                </a>
              )}
            </div>
          </div>
          <div className="hidden items-center justify-center md:flex">
            {settings.heroImageUrl ? (
              <img
                src={settings.heroImageUrl}
                alt={settings.businessName}
                className="max-h-96 w-full rounded-2xl object-cover shadow-2xl"
              />
            ) : (
              <div className="flex h-72 w-full items-center justify-center rounded-2xl bg-white/10 text-8xl">
                🎥
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
          <Link to="/products" className="text-sm font-semibold text-brand-700 hover:underline">
            View all →
          </Link>
        </div>
        {loading ? <FullPageSpinner /> : <ProductGrid products={shown} />}
      </section>

      {services.length > 0 && (
        <section className="bg-white py-12">
          <div className="container-page">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">Our Services</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.slice(0, 6).map((s) => (
                <div key={s.id} className="card p-5">
                  {s.images[0] && (
                    <img src={s.images[0]} alt={s.title} className="mb-3 h-40 w-full rounded-lg object-cover" />
                  )}
                  <h3 className="font-semibold text-gray-900">{s.title}</h3>
                  <p className="mt-1 line-clamp-3 text-sm text-gray-600">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
