import { Link } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/utils/format';
import { EmptyState } from '@/components/ui/EmptyState';

export default function Cart() {
  const { items, updateQty, removeItem, totalPrice } = useCart();

  return (
    <div className="container-page py-8">
      <Seo title="Your Cart" description="Review items in your cart." path="/cart" />
      <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Your cart is empty"
            description="Browse our products and add items to get started."
            action={<Link to="/products" className="btn-primary">Browse Products</Link>}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="card divide-y divide-gray-100 lg:col-span-2">
            {items.map((item) => (
              <div key={item.productId} className="flex gap-4 p-4">
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {item.image && <img src={item.image} alt={item.name} className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="mt-1 text-sm text-gray-600">{formatPrice(item.price)} each</p>
                  <div className="mt-3 flex items-center gap-2">
                    <button className="h-8 w-8 rounded border border-gray-300 hover:bg-gray-50" onClick={() => updateQty(item.productId, item.qty - 1)} aria-label="Decrease quantity">−</button>
                    <span className="w-8 text-center">{item.qty}</span>
                    <button className="h-8 w-8 rounded border border-gray-300 hover:bg-gray-50" onClick={() => updateQty(item.productId, item.qty + 1)} aria-label="Increase quantity">+</button>
                    <button className="ml-4 text-sm font-medium text-red-600 hover:underline" onClick={() => removeItem(item.productId)}>Remove</button>
                  </div>
                </div>
                <div className="font-semibold text-gray-900">{formatPrice(item.price * item.qty)}</div>
              </div>
            ))}
          </div>

          <div className="card h-fit p-6">
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
            <Link to="/checkout" className="btn-primary mt-6 w-full">Proceed to Checkout</Link>
          </div>
        </div>
      )}
    </div>
  );
}
