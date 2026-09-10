import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { ProductGrid } from '@/components/products/ProductGrid';
import { FullPageSpinner } from '@/components/ui/Spinner';

export default function Products() {
  const { products, loading } = useProducts();
  const { categories } = useCategories();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');

  const activeCategory = params.get('category') ?? '';

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (activeCategory && p.categoryId !== activeCategory) return false;
      if (search.trim() && !p.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [products, activeCategory, search]);

  return (
    <div className="container-page py-8">
      <Seo title="Shop CCTV Cameras & Accessories" description="Browse our full range of CCTV cameras, DVRs, NVRs and accessories." path="/products" />

      <h1 className="text-2xl font-bold text-gray-900">Products</h1>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setParams((p) => { p.delete('category'); return p; })}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              !activeCategory ? 'bg-brand-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            } border border-gray-200`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setParams((p) => { p.set('category', c.id); return p; })}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                activeCategory === c.id ? 'bg-brand-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              } border border-gray-200`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input sm:w-64"
        />
      </div>

      <div className="mt-8">
        {loading ? <FullPageSpinner /> : <ProductGrid products={filtered} />}
      </div>
    </div>
  );
}
