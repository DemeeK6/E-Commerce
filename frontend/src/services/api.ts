import type { AppSetting, AuthResponse, BankAccount, ExchangeRate, HomeHero, InfoSection, Category, Color, GenderTarget, Order, PaymentStatus, PlaceOrderPayload, Product } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? body.errors?.join?.(', ') ?? 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  products: (gender?: GenderTarget, includeInactive = false, search?: string) => {
    const params = new URLSearchParams({ includeInactive: String(includeInactive) });
    if (gender !== undefined) params.set('gender', String(gender));
    if (search) params.set('search', search);
    return request<Product[]>(`/api/products?${params}`);
  },
  product: (id: string | number) => request<Product>(`/api/products/${id}`),
  saveProduct: (product: Partial<Product> & { categoryId: number }) => {
    const payload = {
      name: product.name,
      description: product.description,
      price: product.price,
      discountPrice: product.discountPrice || null,
      categoryId: product.categoryId,
      sizes: product.sizes ?? [],
      colors: (product.colors ?? []).map((color) => ({ colorId: color.colorId })),
      images: (product.images ?? []).map((image) => ({
        url: image.url,
        altText: image.altText,
        isPrimary: image.isPrimary,
        sortOrder: image.sortOrder,
        colorId: image.colorId,
        // Must be sent explicitly. The server defaults a missing focus point to
        // the centre rather than rejecting it, so leaving these out silently
        // threw away the shop's choice every time a product was saved.
        focusX: image.focusX ?? 50,
        focusY: image.focusY ?? 50,
      })),
      isActive: product.isActive ?? true,
    };
    return product.id
      ? request<Product>(`/api/products/${product.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      : request<Product>('/api/products', { method: 'POST', body: JSON.stringify(payload) });
  },
  /** Deletes the product for good. Past orders keep their own copy of its details. */
  deleteProduct: (id: number) => request<void>(`/api/products/${id}`, { method: 'DELETE' }),
  setProductActive: (id: number, isActive: boolean) =>
    request<Product>(`/api/products/${id}/active`, { method: 'PUT', body: JSON.stringify({ isActive }) }),
  bulkDiscount: (productIds: number[], percentage: number) =>
    request<{ updated: number }>('/api/products/bulk-discount', { method: 'POST', body: JSON.stringify({ productIds, percentage }) }),
  categories: (gender?: GenderTarget | '', includeDisabled = false) => {
    const params = new URLSearchParams();
    if (gender !== '') params.set('gender', String(gender ?? 0));
    if (includeDisabled) params.set('includeDisabled', 'true');
    const qs = params.toString();
    return request<Category[]>(`/api/categories${qs ? `?${qs}` : ''}`);
  },
  saveCategory: (category: Partial<Category>) =>
    category.id
      ? request<Category>(`/api/categories/${category.id}`, { method: 'PUT', body: JSON.stringify(category) })
      : request<Category>('/api/categories', { method: 'POST', body: JSON.stringify(category) }),
  deleteCategory: (id: number, moveProductsTo?: number) =>
    request<{ moved: number }>(
      `/api/categories/${id}${moveProductsTo ? `?moveProductsTo=${moveProductsTo}` : ''}`,
      { method: 'DELETE' },
    ),
  colors: (includeDisabled = false) =>
    request<Color[]>(`/api/colors${includeDisabled ? '?includeDisabled=true' : ''}`),
  saveColor: (color: Partial<Color>) =>
    color.id
      ? request<Color>(`/api/colors/${color.id}`, { method: 'PUT', body: JSON.stringify(color) })
      : request<Color>('/api/colors', { method: 'POST', body: JSON.stringify(color) }),
  deleteColor: (id: number) => request<void>(`/api/colors/${id}`, { method: 'DELETE' }),
  bankAccounts: (includeDisabled = false) =>
    request<BankAccount[]>(`/api/bankaccounts${includeDisabled ? '?includeDisabled=true' : ''}`),
  saveBankAccount: (account: BankAccount) =>
    request<BankAccount>(`/api/bankaccounts/${account.id}`, { method: 'PUT', body: JSON.stringify(account) }),
  infoSections: (includeDisabled = false) =>
    request<InfoSection[]>(`/api/infosections${includeDisabled ? '?includeDisabled=true' : ''}`),
  saveInfoSection: (section: InfoSection) =>
    request<InfoSection>(`/api/infosections/${section.id}`, { method: 'PUT', body: JSON.stringify(section) }),
  exchangeRate: () => request<ExchangeRate>('/api/exchange-rate'),
  homeHero: (includeDisabled = false) =>
    request<HomeHero>(`/api/home-hero${includeDisabled ? '?includeDisabled=true' : ''}`),
  saveHomeHero: (hero: HomeHero) =>
    request<HomeHero>('/api/home-hero', {
      method: 'PUT',
      body: JSON.stringify({
        ...hero,
        slides: hero.slides.map(slide => ({
          imageUrl: slide.imageUrl, isEnabled: slide.isEnabled, focusX: slide.focusX, focusY: slide.focusY,
        })),
      }),
    }),
  settings: () => request<AppSetting[]>('/api/settings'),
  updateSetting: (key: string, isEnabled: boolean) =>
    request<AppSetting>(`/api/settings/${key}`, { method: 'PUT', body: JSON.stringify({ isEnabled }) }),
  updateSettingValue: (key: string, value: string) =>
    request<AppSetting>(`/api/settings/${key}`, { method: 'PUT', body: JSON.stringify({ isEnabled: true, value }) }),
  dashboard: () => request<Record<string, number>>('/api/admin/dashboard'),
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (firstName: string, lastName: string, email: string, password: string, phone: string) =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify({ firstName, lastName, email, password, phone }) }),
  resetPassword: (email: string) => request<{ message: string }>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ email }) }),
  me: () => request<AuthResponse['user']>('/api/auth/me'),
  uploadImage: async (file: File): Promise<string> => {
    const token = localStorage.getItem('auth_token');
    const body = new FormData();
    body.append('file', file);
    const response = await fetch('/api/uploads/image', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message ?? 'Upload failed');
    }
    const data = await response.json() as { url: string };
    return data.url;
  },
  placeOrder: (payload: PlaceOrderPayload) =>
    request<Order>('/api/orders', { method: 'POST', body: JSON.stringify(payload) }),
  orders: () => request<Order[]>('/api/orders'),
  confirmTransfer: (id: number, publicToken: string) =>
    request<Order>(`/api/orders/${id}/confirm-transfer`, { method: 'POST', body: JSON.stringify({ publicToken }) }),
  cancelOrder: (id: number, publicToken: string) =>
    request<Order>(`/api/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ publicToken }) }),
  adminOrders: () => request<Order[]>('/api/admin/orders'),
  updateOrderStatus: (id: number, status: string) =>
    request<Order>(`/api/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  updatePaymentStatus: (id: number, paymentStatus: PaymentStatus, paymentReference?: string) =>
    request<Order>(`/api/orders/${id}/payment`, { method: 'PUT', body: JSON.stringify({ paymentStatus, paymentReference }) }),
};
