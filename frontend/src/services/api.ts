import type { AppSetting, AuthResponse, Category, GenderTarget, Order, Product } from '../types';

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
  products: (gender: GenderTarget = 0, includeInactive = false, search?: string) => {
    const params = new URLSearchParams({ gender: String(gender), includeInactive: String(includeInactive) });
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
      genderTarget: product.genderTarget ?? 0,
      sizes: product.sizes ?? [],
      colors: product.colors ?? [],
      images: product.images ?? [],
      stockQuantity: product.stockQuantity ?? 0,
      isActive: product.isActive ?? true,
    };
    return product.id
      ? request<Product>(`/api/products/${product.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      : request<Product>('/api/products', { method: 'POST', body: JSON.stringify(payload) });
  },
  deleteProduct: (id: number) => request<void>(`/api/products/${id}`, { method: 'DELETE' }),
  categories: (gender?: GenderTarget | '') => request<Category[]>(gender === '' ? '/api/categories' : `/api/categories?gender=${gender ?? 0}`),
  saveCategory: (category: Partial<Category>) =>
    category.id
      ? request<Category>(`/api/categories/${category.id}`, { method: 'PUT', body: JSON.stringify(category) })
      : request<Category>('/api/categories', { method: 'POST', body: JSON.stringify(category) }),
  deleteCategory: (id: number) => request<void>(`/api/categories/${id}`, { method: 'DELETE' }),
  settings: () => request<AppSetting[]>('/api/settings'),
  updateSetting: (key: string, isEnabled: boolean) =>
    request<AppSetting>(`/api/settings/${key}`, { method: 'PUT', body: JSON.stringify({ isEnabled }) }),
  dashboard: () => request<Record<string, number>>('/api/admin/dashboard'),
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (firstName: string, lastName: string, email: string, password: string) =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify({ firstName, lastName, email, password }) }),
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
  placeOrder: () =>
    request<Order>('/api/orders', { method: 'POST', body: '{}' }),
  orders: () => request<Order[]>('/api/orders'),
  adminOrders: () => request<Order[]>('/api/admin/orders'),
  updateOrderStatus: (id: number, status: string) =>
    request<Order>(`/api/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
};
