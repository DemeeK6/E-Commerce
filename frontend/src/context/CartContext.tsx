import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import type { CartLine, Product } from '../types';

interface CartContextValue {
  lines: CartLine[];
  count: number;
  total: number;
  add: (product: Product, quantity: number, size: string, color: string) => void;
  updateQuantity: (localId: string, quantity: number) => void;
  remove: (localId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = 'menswear_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) as CartLine[] : [];
  });

  const save = (next: CartLine[]) => {
    setLines(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const add = (product: Product, quantity: number, size: string, color: string) => {
    const price = product.discountPrice ?? product.price;
    const imageUrl = product.images[0]?.url;
    const existing = lines.find(line => line.productId === product.id && line.size === size && line.color === color);
    if (existing) {
      save(lines.map(line => line.localId === existing.localId ? { ...line, quantity: line.quantity + quantity } : line));
      return;
    }

    save([...lines, {
      localId: crypto.randomUUID(),
      productId: product.id,
      productName: product.name,
      imageUrl,
      price,
      quantity,
      size,
      color,
    }]);
  };

  const updateQuantity = (localId: string, quantity: number) => {
    save(quantity <= 0 ? lines.filter(line => line.localId !== localId) : lines.map(line => line.localId === localId ? { ...line, quantity } : line));
  };

  const remove = (localId: string) => save(lines.filter(line => line.localId !== localId));
  const clear = () => save([]);

  const value = useMemo(() => ({
    lines,
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    total: lines.reduce((sum, line) => sum + line.quantity * line.price, 0),
    add,
    updateQuantity,
    remove,
    clear,
  }), [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return context;
}
