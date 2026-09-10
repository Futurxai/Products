import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/utils/format';

export function CartDrawer() {
  const { items, isOpen, closeCart, updateQty, removeItem, totalPrice } = useCart();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={closeCart} aria-hidden="true" />
      )}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-sm transform flex-col bg-white shadow-xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-bold">Your Cart</h2>
          <button onClick={closeCart} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100" aria-label="Close cart">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="mt-8 text-center text-sm text-gray-500">Your cart is empty.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.productId} className="flex gap-3">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {item.image && <img src={item.image} alt={item.name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="mt-1 text-sm font-semibold text-brand-700">{formatPrice(item.price)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        className="h-7 w-7 rounded border border-gray-300 text-sm hover:bg-gray-50"
                        onClick={() => updateQty(item.productId, item.qty - 1)}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm">{item.qty}</span>
                      <button
                        className="h-7 w-7 rounded border border-gray-300 text-sm hover:bg-gray-50"
                        onClick={() => updateQty(item.productId, item.qty + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                      <button
                        className="ml-auto text-xs font-medium text-red-600 hover:underline"
                        onClick={() => removeItem(item.productId)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-gray-200 px-5 py-4">
            <div className="mb-3 flex items-center justify-between text-base font-bold">
              <span>Total</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
            <Link to="/checkout" onClick={closeCart} className="btn-primary w-full">
              Checkout
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
