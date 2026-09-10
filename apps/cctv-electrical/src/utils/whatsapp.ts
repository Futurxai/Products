import type { CartItem, OrderCustomer, Product } from '@/types';
import { formatPrice } from './format';

function normalizeNumber(number: string): string {
  return number.replace(/[^0-9]/g, '');
}

export function buildWhatsAppLink(number: string, message: string): string {
  const digits = normalizeNumber(number);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function productEnquiryMessage(product: Product): string {
  return [
    `Hi! I'm interested in this product:`,
    `*${product.name}*`,
    product.price ? `Price: ${formatPrice(product.price)}` : undefined,
    `Could you share more details / availability?`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function orderWhatsAppMessage(
  items: CartItem[],
  customer: OrderCustomer,
  total: number,
  orderId?: string,
): string {
  const lines = [
    `*New Order${orderId ? ` #${orderId.slice(0, 8).toUpperCase()}` : ''}*`,
    '',
    ...items.map(
      (i) => `• ${i.name} x${i.qty} — ${formatPrice(i.price * i.qty)}`,
    ),
    '',
    `*Total: ${formatPrice(total)}*`,
    '',
    `*Customer Details*`,
    `Name: ${customer.name}`,
    `Phone: ${customer.phone}`,
    `Address: ${customer.address}`,
    customer.notes ? `Notes: ${customer.notes}` : undefined,
  ].filter(Boolean);

  return lines.join('\n');
}
