import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Seo } from '@/components/Seo';
import { useProducts } from '@/hooks/useProducts';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/utils/format';
import { buildWhatsAppLink, productEnquiryMessage } from '@/utils/whatsapp';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { products, loading } = useProducts();
  const { settings } = useSettings();
  const { addItem } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);

  if (loading) return <FullPageSpinner />;

  const product = products.find((p) => p.slug === slug);

  if (!product) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Product not found"
          description="This product may have been removed or is no longer available."
          action={<Link to="/products" className="btn-primary">Browse Products</Link>}
        />
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <Seo
        title={`${product.name} | Buy Online`}
        description={product.description.slice(0, 160)}
        image={product.images[0]}
        path={`/products/${product.slug}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          image: product.images,
          description: product.description,
          offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'INR',
            availability: product.available
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          },
        }}
      />

      <nav className="mb-6 text-sm text-gray-500">
        <Link to="/products" className="hover:text-brand-700">Products</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
            {product.images[activeImage] ? (
              <img src={product.images[activeImage]} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-300">No image</div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.map((img, idx) => (
                <button
                  key={img}
                  onClick={() => setActiveImage(idx)}
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${
                    activeImage === idx ? 'border-brand-700' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{product.categoryName}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{product.name}</h1>

          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-900">{formatPrice(product.price)}</span>
            {product.mrp && product.mrp > product.price && (
              <span className="text-lg text-gray-400 line-through">{formatPrice(product.mrp)}</span>
            )}
          </div>

          <p className="mt-2 text-sm font-medium">
            {product.available ? (
              <span className="text-green-600">✓ In Stock</span>
            ) : (
              <span className="text-red-600">✕ Out of Stock</span>
            )}
          </p>

          <p className="mt-6 whitespace-pre-line text-gray-700">{product.description}</p>

          {product.specs && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900">Specifications</h3>
              <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{product.specs}</p>
            </div>
          )}

          <div className="mt-8 flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-gray-300">
              <button className="px-3 py-2 text-lg" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
              <span className="w-8 text-center">{qty}</span>
              <button className="px-3 py-2 text-lg" onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity">+</button>
            </div>
            <button
              className="btn-primary flex-1"
              disabled={!product.available}
              onClick={() => {
                addItem(product, qty);
                toast.success(`${product.name} added to cart`);
              }}
            >
              {product.available ? 'Add to Cart' : 'Unavailable'}
            </button>
          </div>

          {settings.whatsappNumber && (
            <a
              href={buildWhatsAppLink(settings.whatsappNumber, productEnquiryMessage(product))}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp mt-3 w-full"
            >
              Enquire on WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
