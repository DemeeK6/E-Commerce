import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import { money } from '../utils/format';

export function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { lines, total, clear } = useCart();
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const placeOrder = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (lines.length === 0) return;
    setLoading(true);
    setError('');
    try {
      await api.placeOrder();
      clear();
      navigate('/orders');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (lines.length === 0) {
    return (
      <section className="section checkout-page">
        <div className="checkout-box">
          <p className="eyebrow">{t('secureCheckout')}</p>
          <h1>{t('checkout')}</h1>
          <p style={{ color: 'var(--muted)' }}>{t('cartEmpty')}</p>
          <Link className="btn btn-dark" to="/products">{t('continueShopping')}</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section checkout-page">
      <div className="checkout-box">
        <p className="eyebrow">{t('secureCheckout')}</p>
        <h1>{t('checkout')}</h1>
        <p>{t('totalDue')}: <strong>{money(total)}</strong></p>
        {!user && (
          <p className="form-error">
            You must be logged in to place an order. <Link to="/login">Login</Link>
          </p>
        )}
        {error && <p className="form-error">{error}</p>}
        <button
          className="btn btn-dark btn-full"
          onClick={placeOrder}
          disabled={loading || !user}
        >
          {loading ? '...' : t('placeOrder')}
        </button>
        <Link to="/cart">{t('cart')}</Link>
      </div>
    </section>
  );
}
