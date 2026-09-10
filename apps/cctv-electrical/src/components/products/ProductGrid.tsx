import type { Product } from '@/types';
import { ProductCard } from './ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <EmptyState title="No products found" description="Try a different category or check back soon." />;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
