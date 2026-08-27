import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { PaymentMethod } from '../types';
import { money } from '../utils/format';

export function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { lines, total, clear } = useCart();
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  // Prefilled for signed-in customers, but every field stays editable: the delivery
  // details for this order are not necessarily the ones on the account.
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (lines.length === 0) return;
    setLoading(true);
    setError('');
    try {
      // Only identifiers and quantities are sent. The server prices every line itself.
      await api.placeOrder({
        firstName,
        lastName,
        phone,
        address,
        email,
        paymentMethod,
        items: lines.map(line => ({
          productId: line.productId,
          quantity: line.quantity,
          size: line.size,
          color: line.color,
        })),
      });
      clear();
      navigate(user ? '/orders' : '/');
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
      <form className="checkout-box" onSubmit={submit}>
        <p className="eyebrow">{t('secureCheckout')}</p>
        <h1>{t('checkout')}</h1>
        <p>{t('totalDue')}: <strong>{money(total)}</strong></p>

        {!user && <p className="checkout-guest-note">{t('guestCheckoutNote')}</p>}

        <div className="two-fields">
          <label>{t('firstName')}<input value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="given-name" required /></label>
          <label>{t('lastName')}<input value={lastName} onChange={e => setLastName(e.target.value)} autoComplete="family-name" required /></label>
        </div>
        <label>{t('phone')}<input value={phone} onChange={e => setPhone(e.target.value)} type="tel" autoComplete="tel" required /></label>
        <label>{t('email')}<input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" /></label>
        <label>{t('shippingAddress')}<textarea value={address} onChange={e => setAddress(e.target.value)} rows={3} autoComplete="street-address" required /></label>

        <fieldset className="payment-methods">
          <legend>{t('paymentMethod')}</legend>
          <label className={paymentMethod === 0 ? 'payment-option selected' : 'payment-option'}>
            <input type="radio" name="paymentMethod" checked={paymentMethod === 0} onChange={() => setPaymentMethod(0)} />
            <span>{t('payCash')}</span>
          </label>
          <label className={paymentMethod === 1 ? 'payment-option selected' : 'payment-option'}>
            <input type="radio" name="paymentMethod" checked={paymentMethod === 1} onChange={() => setPaymentMethod(1)} />
            <span>{t('payBankTransfer')}</span>
          </label>
        </fieldset>

        {paymentMethod === 1 && (
          // TODO: replace with the shop's real bank account details once supplied.
          <p className="bank-details-placeholder">{t('bankDetailsPlaceholder')}</p>
        )}

        {error && <p className="form-error">{error}</p>}

        <button className="btn btn-dark btn-full" type="submit" disabled={loading}>
          {loading ? '...' : t('placeOrder')}
        </button>
        <Link to="/cart">{t('cart')}</Link>
      </form>
    </section>
  );
}
