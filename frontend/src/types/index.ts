export type GenderTarget = 0 | 1 | 2;

export interface Category {
  id: number;
  nameEn: string;
  nameKa: string;
  nameRu: string;
  slug: string;
  genderTarget: GenderTarget;
  isEnabled: boolean;
  displayOrder: number;
}

export interface Color {
  id: number;
  nameEn: string;
  nameKa: string;
  nameRu: string;
  hexCode: string;
  displayOrder: number;
  isEnabled: boolean;
}

export interface ProductImage {
  id: number;
  url: string;
  altText: string;
  isPrimary: boolean;
  sortOrder: number;
  colorId: number | null;
}

export interface ProductColor {
  id: number;
  colorId: number;
  nameEn: string;
  nameKa: string;
  nameRu: string;
  hexCode: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  discountPrice?: number | null;
  category?: Category | null;
  genderTarget: GenderTarget;
  sizes: string[];
  colors: ProductColor[];
  images: ProductImage[];
  isActive: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  roles: string[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AppSetting {
  id: number;
  key: string;
  name: string;
  isEnabled: boolean;
}

export interface CartLine {
  localId: string;
  productId: number;
  productName: string;
  imageUrl?: string;
  price: number;
  quantity: number;
  size: string;
  color: string;
}

export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  size: string;
  color: string;
}

export type PaymentMethod = 0 | 1;   // 0 = Cash, 1 = BankTransfer
export type PaymentStatus = 0 | 1 | 2 | 3;  // 0 = Pending, 1 = Paid, 2 = Failed, 3 = Refunded

export interface Order {
  id: number;
  userEmail: string;
  isGuest: boolean;
  customerFirstName: string;
  customerLastName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  total: number;
  createdAtUtc: string;
  items: OrderItem[];
}

export interface PlaceOrderPayload {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  email: string;
  paymentMethod: PaymentMethod;
  items: { productId: number; quantity: number; size: string; color: string }[];
}
