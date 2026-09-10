import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Seo } from '@/components/Seo';
import { useCart } from '@/contexts/CartContext';
import { useSettings } from '@/hooks/useSettings';
import { submitOrder } from '@/hooks/useOrders';
import { formatPrice } from '@/utils/format';
import { buildWhatsAppLink, orderWhatsAppMessage } from '@/utils/whatsapp';
import { EmptyState } from '@/components/ui/EmptyState';

export default function Checkout() {
  const { items, totalPrice, clearCart } = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (items.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Your cart is empty"
          description="Add some products before checking out."
          action={<Link to="/products" className="btn-primary">Browse Products</Link>}
        />
      </div>
    );
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Name is required';
    if (!phone.trim() || phone.replace(/[^0-9]/g, '').length < 7) next.phone = 'Enter a valid phone number';
    if (!address.trim()) next.address = 'Delivery address is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    const customer = { name: name.trim(), phone: phone.trim(), address: address.trim(), notes: notes.trim() || undefined };

    try {
      const orderId = await submitOrder(items, customer);

      const targetNumber = settings.whatsappNumber;
      if (targetNumber) {
        const message = orderWhatsAppMessage(items, customer, totalPrice, orderId);
        window.open(buildWhatsAppLink(targetNumber, message), '_blank', 'noopener,noreferrer');
      } else {
        toast.error('WhatsApp number not configured — order saved, we will contact you.');
      }

      clearCart();
      toast.success('Order placed! We will confirm shortly.');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-page py-8">
      <Seo title="Checkout" description="Complete your order." path="/checkout" />
      <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="card space-y-4 p-6 lg:col-span-2" noValidate>
          <div>
            <label className="label" htmlFor="name">Full Name</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone Number</label>
            <input id="phone" type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} required />
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
          </div>
          <div>
            <label className="label" htmlFor="address">Delivery / Installation Address</label>
            <textarea id="address" className="input" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={500} required />
            {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
          </div>
          <div>
            <label className="label" htmlFor="notes">Notes (optional)</label>
            <textarea id="notes" className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Placing order…' : 'Place Order via WhatsApp'}
          </button>
          <p className="text-xs text-gray-500">
            We&apos;ll open WhatsApp with your order details pre-filled so you can confirm with us directly.
          </p>
        </form>

        <div className="card h-fit p-6">
          <h2 className="font-semibold text-gray-900">Order Summary</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {items.map((item) => (
              <li key={item.productId} className="flex justify-between">
                <span className="text-gray-600">{item.name} × {item.qty}</span>
                <span className="font-medium text-gray-900">{formatPrice(item.price * item.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-gray-100 pt-4 text-base font-bold">
            <span>Total</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
