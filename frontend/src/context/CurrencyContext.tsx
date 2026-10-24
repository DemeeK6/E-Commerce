import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { Currency, ExchangeRate, Order } from '../types';
import { formatAmount } from '../utils/format';

type CurrencyContextValue = {
  /** What prices are shown in. USD only once a rate is known, otherwise GEL. */
  currency: Currency;
  /** What the shopper picked, even while USD is unavailable. */
  chosen: Currency;
  setCurrency: (currency: Currency) => void;
  /** Today's National Bank rate, or null when it could not be loaded. */
  rate: ExchangeRate | null;
  /** A lari price (as stored on every product) shown in the chosen currency. */
  price: (lari: number) => string;
  /** An order amount in the currency and at the rate fixed on that order. */
  orderPrice: (order: Pick<Order, 'currency' | 'exchangeRate'>, lari: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function stored(): Currency {
  try {
    return localStorage.getItem('currency') === 'USD' ? 'USD' : 'GEL';
  } catch {
    return 'GEL';
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [chosen, setChosen] = useState<Currency>(stored);
  const [rate, setRate] = useState<ExchangeRate | null>(null);

  useEffect(() => {
    api.exchangeRate().then(setRate).catch(() => setRate(null));
  }, []);

  const value = useMemo<CurrencyContextValue>(() => {
    // Never invent a dollar price: without a rate everything stays in lari.
    const currency: Currency = chosen === 'USD' && rate ? 'USD' : 'GEL';
    return {
      currency,
      chosen,
      setCurrency: next => {
        setChosen(next);
        try { localStorage.setItem('currency', next); } catch { /* private mode */ }
      },
      rate,
      price: gel => formatAmount(currency === 'USD' && rate ? gel / rate.usdToGel : gel, currency),
      orderPrice: (order, gel) =>
        formatAmount(order.currency === 'USD' && order.exchangeRate > 0 ? gel / order.exchangeRate : gel, order.currency),
    };
  }, [chosen, rate]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used inside CurrencyProvider');
  }
  return context;
}
