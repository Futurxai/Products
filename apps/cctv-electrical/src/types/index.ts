export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  createdAt: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  description: string;
  price: number;
  mrp?: number;
  images: string[];
  available: boolean;
  featured: boolean;
  specs?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  images: string[];
  order: number;
  createdAt: number;
}

export interface BusinessSettings {
  businessName: string;
  tagline: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  address: string;
  workingHours: string;
  logoUrl: string;
  heroImageUrl: string;
  facebookUrl?: string;
  instagramUrl?: string;
  mapEmbedUrl?: string;
  seoDescription?: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  qty: number;
  available: boolean;
}

export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface OrderCustomer {
  name: string;
  phone: string;
  address: string;
  notes?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  image: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  customer: OrderCustomer;
  subtotal: number;
  total: number;
  status: OrderStatus;
  createdAt: number;
}
