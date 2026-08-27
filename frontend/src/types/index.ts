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

export interface Order {
  id: number;
  userEmail: string;
  status: OrderStatus;
  total: number;
  createdAtUtc: string;
  items: OrderItem[];
}
