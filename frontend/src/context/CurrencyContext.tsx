import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { Currency, ExchangeRate, Order } from '../types';
import { formatAmount } from '../utils/format';

type CurrencyContextValue = {
  /** What prices are shown in. GEL only once a rate is known, otherwise USD. */
  currency: Currency;
  /** What the shopper picked, even while GEL is unavailable. */
  chosen: Currency;
  setCurrency: (currency: Currency) => void;
  /** Today's National Bank rate, or null when it could not be loaded. */
  rate: ExchangeRate | null;
  /** A dollar price (as stored on every product) shown in the chosen currency. */
  price: (usd: number) => string;
  /** An order amount in the currency and at the rate fixed on that order. */
  orderPrice: (order: Pick<Order, 'currency' | 'exchangeRate'>, usd: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function stored(): Currency {
  try {
    return localStorage.getItem('currency') === 'GEL' ? 'GEL' : 'USD';
  } catch {
    return 'USD';
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [chosen, setChosen] = useState<Currency>(stored);
  const [rate, setRate] = useState<ExchangeRate | null>(null);

  useEffect(() => {
    api.exchangeRate().then(setRate).catch(() => setRate(null));
  }, []);

  const value = useMemo<CurrencyContextValue>(() => {
    // Never invent a lari price: without a rate everything stays in dollars.
    const currency: Currency = chosen === 'GEL' && rate ? 'GEL' : 'USD';
    return {
      currency,
      chosen,
      setCurrency: next => {
        setChosen(next);
        try { localStorage.setItem('currency', next); } catch { /* private mode */ }
      },
      rate,
      price: usd => formatAmount(currency === 'GEL' && rate ? usd * rate.usdToGel : usd, currency),
      orderPrice: (order, usd) => formatAmount(usd * order.exchangeRate, order.currency),
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
