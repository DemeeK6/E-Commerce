import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { BankAccount, Order, PaymentMethod, TransferBank } from '../types';
import { BankTransferModal } from '../components/BankTransferModal';
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
  const [transferBank, setTransferBank] = useState<TransferBank | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [shopPhone, setShopPhone] = useState('');
  // Held after a successful transfer order so the instructions can be shown. The
  // cart is already cleared at this point, so the modal is the customer's only
  // copy of where to send the money.
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  useEffect(() => {
    api.bankAccounts().then(setBankAccounts).catch(() => setBankAccounts([]));
    api.settings()
      .then(items => setShopPhone(items.find(item => item.key === 'shop_phone')?.value ?? ''))
      .catch(() => setShopPhone(''));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (lines.length === 0) return;
    if (paymentMethod === 1 && transferBank === null) {
      setError(t('chooseBankError'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Only identifiers and quantities are sent. The server prices every line itself.
      const order = await api.placeOrder({
        firstName,
        lastName,
        phone,
        address,
        email,
        paymentMethod,
        transferBank: paymentMethod === 1 ? transferBank : null,
        items: lines.map(line => ({
          productId: line.productId,
          quantity: line.quantity,
          size: line.size,
          color: line.color,
        })),
      });
      clear();
      // A transfer needs the account details before the customer leaves; a cash
      // order has nothing more to say, so it navigates away immediately.
      if (paymentMethod === 1) {
        setPlacedOrder(order);
      } else {
        navigate(user ? '/orders' : '/');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Placing the order clears the cart, so without the placedOrder guard this early
  // return fires first and the customer is shown "your cart is empty" instead of the
  // account to pay into - the one screen they cannot afford to miss.
  if (lines.length === 0 && !placedOrder) {
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
        <p className="checkout-total">{t('totalDue')}: <strong>{money(total)}</strong></p>

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
          <fieldset className="payment-methods bank-picker">
            <legend>{t('chooseBank')}</legend>
            {bankAccounts.length === 0 ? (
              <p className="bank-details-placeholder">{t('noBankAccounts')}</p>
            ) : bankAccounts.map(account => (
              <label
                key={account.id}
                className={transferBank === account.bank ? 'payment-option selected' : 'payment-option'}
              >
                <input
                  type="radio"
                  name="transferBank"
                  checked={transferBank === account.bank}
                  onChange={() => setTransferBank(account.bank)}
                />
                <span>{account.bank === 0 ? t('bankTbc') : t('bankBog')}</span>
              </label>
            ))}
          </fieldset>
        )}

        {error && <p className="form-error">{error}</p>}

        <button className="btn btn-dark btn-full" type="submit" disabled={loading}>
          {loading ? '...' : t('placeOrder')}
        </button>
        <Link to="/cart">{t('cart')}</Link>
      </form>

      {placedOrder && placedOrder.transferBank !== null && (
        <BankTransferModal
          account={bankAccounts.find(a => a.bank === placedOrder.transferBank)!}
          orderId={placedOrder.id}
          total={placedOrder.total}
          shopPhone={shopPhone}
          onClose={() => { setPlacedOrder(null); navigate(user ? '/orders' : '/'); }}
        />
      )}
    </section>
  );
}
