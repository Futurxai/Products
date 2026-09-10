import { Link } from 'react-router-dom';
import type { Product } from '@/types';
import { formatPrice } from '@/utils/format';
import { useCart } from '@/contexts/CartContext';
import { useSettings } from '@/hooks/useSettings';
import { buildWhatsAppLink, productEnquiryMessage } from '@/utils/whatsapp';
import toast from 'react-hot-toast';

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { settings } = useSettings();
  const image = product.images[0];

  return (
    <div className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link to={`/products/${product.slug}`} className="relative aspect-square overflow-hidden bg-gray-100">
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">No image</div>
        )}
        {!product.available && (
          <span className="absolute left-2 top-2 rounded-full bg-gray-900/80 px-2 py-1 text-xs font-semibold text-white">
            Out of stock
          </span>
        )}
        {product.featured && product.available && (
          <span className="absolute left-2 top-2 rounded-full bg-accent-500 px-2 py-1 text-xs font-semibold text-white">
            Featured
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700">{product.categoryName}</p>
        <Link to={`/products/${product.slug}`} className="mt-1 line-clamp-2 font-semibold text-gray-900 hover:text-brand-700">
          {product.name}
        </Link>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-gray-900">{formatPrice(product.price)}</span>
          {product.mrp && product.mrp > product.price && (
            <span className="text-sm text-gray-400 line-through">{formatPrice(product.mrp)}</span>
          )}
        </div>

        <div className="mt-4 flex flex-1 items-end gap-2">
          <button
            className="btn-primary flex-1"
            disabled={!product.available}
            onClick={() => {
              addItem(product);
              toast.success(`${product.name} added to cart`);
            }}
          >
            {product.available ? 'Add to Cart' : 'Unavailable'}
          </button>
          {settings.whatsappNumber && (
            <a
              href={buildWhatsAppLink(settings.whatsappNumber, productEnquiryMessage(product))}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp px-3"
              aria-label={`Enquire about ${product.name} on WhatsApp`}
              title="Enquire on WhatsApp"
            >
              WA
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
