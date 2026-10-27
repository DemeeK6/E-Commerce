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
  /** How many products sit in this category. Only the categories listing fills it in. */
  productCount: number;
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
  value: string;
  kind: 0 | 1;   // 0 = feature toggle, 1 = free text
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
  /** Null once the product has been deleted; the line keeps its own name and price. */
  productId: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  size: string;
  color: string;
}

export type PaymentMethod = 0 | 1;   // 0 = Cash, 1 = BankTransfer
export type PaymentStatus = 0 | 1 | 2 | 3;  // 0 = Pending, 1 = Paid, 2 = Failed, 3 = Refunded

export type Currency = 'USD' | 'GEL';

/** How many lari one dollar costs, from the National Bank of Georgia. */
export interface ExchangeRate {
  usdToGel: number;
  validFrom: string;
}

export interface Order {
  id: number;
  /** What people see, e.g. ON-261018-4827. `id` is internal only. */
  orderNumber: string;
  userEmail: string;
  isGuest: boolean;
  customerFirstName: string;
  customerLastName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transferBank: TransferBank | null;
  customerConfirmedPaymentAtUtc: string | null;
  publicToken: string;
  status: OrderStatus;
  total: number;
  /** The customer's currency and the rate fixed at checkout (lari per dollar). `total` is in lari. */
  currency: Currency;
  exchangeRate: number;
  totalInCurrency: number;
  createdAtUtc: string;
  items: OrderItem[];
}

export interface InfoSection {
  id: number;
  key: string;
  titleEn: string;
  titleKa: string;
  titleRu: string;
  bodyEn: string;
  bodyKa: string;
  bodyRu: string;
  isEnabled: boolean;
  displayOrder: number;
}

export interface HeroSlide {
  id: number;
  imageUrl: string;
  isEnabled: boolean;
  displayOrder: number;
  /** The spot to keep in view, in % from the left and top of the photo. */
  focusX: number;
  focusY: number;
}

/** The home page welcome banner. Blank texts fall back to the built-in translations. */
export interface HomeHero {
  eyebrowEn: string;
  eyebrowKa: string;
  eyebrowRu: string;
  titleEn: string;
  titleKa: string;
  titleRu: string;
  /** The small line under the big title; hidden when empty in every language. */
  subtitleEn: string;
  subtitleKa: string;
  slideIntervalSeconds: number;
  slides: HeroSlide[];
}

export type TransferBank = 0 | 1;  // 0 = TBC, 1 = Bank of Georgia

export interface BankAccount {
  id: number;
  bank: TransferBank;
  accountHolder: string;
  iban: string;
  currencies: string;
  isEnabled: boolean;
  displayOrder: number;
}

export interface PlaceOrderPayload {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  email: string;
  paymentMethod: PaymentMethod;
  transferBank: TransferBank | null;
  items: { productId: number; quantity: number; size: string; color: string }[];
  language: 'en' | 'ka';
  currency: Currency;
}
