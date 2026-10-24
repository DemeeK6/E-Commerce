import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { Order, OrderStatus } from '../types';
import { formatAmount, lari } from '../utils/format';

const STATUSES: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

type StatusTab = 'all' | 'action' | OrderStatus;
type PaymentFilter = 'any' | 'paid' | 'unpaid';
type MethodFilter = 'any' | 'cash' | 'transfer';

/**
 * What the shop owner should look at now: a transfer the customer says is paid but
 * she has not confirmed, or a new order still waiting to be handled. A transfer the
 * customer never confirmed is waiting on them, not on her, so it is left out.
 */
function needsAction(order: Order): boolean {
  if (order.status === 'Cancelled' || order.status === 'Delivered') return false;
  if (order.paymentMethod === 1) {
    if (!order.customerConfirmedPaymentAtUtc) return false;
    if (order.paymentStatus !== 1) return true;
  }
  return order.status === 'Pending';
}

/** Order number, name, phone (spaces ignored) or email contains the query. */
function matchesSearch(order: Order, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, '');
  const phone = order.customerPhone.replace(/\D/g, '');
  return order.orderNumber.toLowerCase().includes(q)
    || `${order.customerFirstName} ${order.customerLastName}`.toLowerCase().includes(q)
    || (order.customerEmail || order.userEmail || '').toLowerCase().includes(q)
    || (digits.length >= 3 && phone.includes(digits));
}

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<StatusTab>('all');
  const [payment, setPayment] = useState<PaymentFilter>('any');
  const [method, setMethod] = useState<MethodFilter>('any');
  const [newestFirst, setNewestFirst] = useState(true);
  const { t } = useI18n();

  // Search, payment and method narrow the list first; the tabs then split what is
  // left by status, so each tab's count is what clicking it would show.
  const narrowed = useMemo(() => orders.filter(order =>
    matchesSearch(order, query)
    && (payment === 'any' || (payment === 'paid') === (order.paymentStatus === 1))
    && (method === 'any' || (method === 'transfer') === (order.paymentMethod === 1))
  ), [orders, query, payment, method]);

  const inTab = (order: Order, which: StatusTab) =>
    which === 'all' ? true : which === 'action' ? needsAction(order) : order.status === which;

  const visible = useMemo(() => narrowed
    .filter(order => inTab(order, tab))
    .sort((a, b) => {
      const diff = new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime();
      return newestFirst ? diff : -diff;
    }), [narrowed, tab, newestFirst]);

  const tabs: { key: StatusTab; label: string }[] = [
    { key: 'all', label: t('allStatuses') },
    { key: 'action', label: t('needsAction') },
    ...STATUSES.map(s => ({ key: s as StatusTab, label: t(s.toLowerCase() as never) })),
  ];

  const filtered = query.trim() !== '' || tab !== 'all' || payment !== 'any' || method !== 'any';
  const clearFilters = () => {
    setQuery('');
    setTab('all');
    setPayment('any');
    setMethod('any');
  };

  const load = () =>
    api.adminOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const changeStatus = async (id: number, status: OrderStatus) => {
    try {
      const updated = await api.updateOrderStatus(id, status);
      setOrders(prev => prev.map(o => o.id === id ? updated : o));
    } catch {
      // status update failed silently
    }
  };

  // Cash and bank transfers settle after the order is placed, so the shop owner confirms
  // payment by hand. A card gateway's webhook would drive this same transition.
  const markPaid = async (id: number) => {
    try {
      const updated = await api.updatePaymentStatus(id, 1);
      setOrders(prev => prev.map(o => o.id === id ? updated : o));
    } catch {
      // payment update failed silently
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="admin-heading">
        <p className="eyebrow">{t('orderManagement')}</p>
        <h1>{t('allOrders')}</h1>
      </div>
      {orders.length > 0 && (
        <div className="order-filters">
          <label className="search-label order-search">
            <Search size={16} />
            <input
              type="search"
              className="search-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('searchOrders')}
              aria-label={t('searchOrders')}
            />
          </label>
          <select value={payment} onChange={e => setPayment(e.target.value as PaymentFilter)} aria-label={t('paymentStatus')}>
            <option value="any">{t('anyPayment')}</option>
            <option value="unpaid">{t('unpaid')}</option>
            <option value="paid">{t('paid')}</option>
          </select>
          <select value={method} onChange={e => setMethod(e.target.value as MethodFilter)} aria-label={t('paymentMethod')}>
            <option value="any">{t('anyMethod')}</option>
            <option value="cash">{t('payCash')}</option>
            <option value="transfer">{t('payBankTransfer')}</option>
          </select>
          <select value={newestFirst ? 'new' : 'old'} onChange={e => setNewestFirst(e.target.value === 'new')} aria-label={t('sortOrders')}>
            <option value="new">{t('newestFirst')}</option>
            <option value="old">{t('oldestFirst')}</option>
          </select>
        </div>
      )}

      {orders.length > 0 && (
        <div className="order-tabs" role="tablist">
          {tabs.map(item => {
            const count = narrowed.filter(order => inTab(order, item.key)).length;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={tab === item.key}
                className={[
                  'order-tab',
                  tab === item.key ? 'is-active' : '',
                  item.key === 'action' && count > 0 ? 'is-urgent' : '',
                ].join(' ')}
                onClick={() => setTab(item.key)}
              >
                {item.label} <span className="order-tab-count">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {orders.length > 0 && (
        <div className="order-results">
          <span>{t('showingOrders').replace('{shown}', String(visible.length)).replace('{total}', String(orders.length))}</span>
          {filtered && (
            <button type="button" className="link-button order-clear" onClick={clearFilters}>
              <X size={14} /> {t('clearFilters')}
            </button>
          )}
        </div>
      )}

      {orders.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>{t('noOrders')}</p>
      ) : visible.length === 0 ? (
        <p className="order-empty">{t('noMatchingOrders')}</p>
      ) : (
        <div className="admin-table">
          {visible.map(order => (
            <article
              className={order.paymentMethod === 1 && order.paymentStatus !== 1
                && order.customerConfirmedPaymentAtUtc && order.status !== 'Cancelled'
                ? 'admin-row admin-order-row order-awaiting'
                : 'admin-row admin-order-row'}
              key={order.id}
            >
              <div className="admin-order-info">
                <div className="admin-order-head">
                  <strong className="admin-order-id">{t('orderId')} {order.orderNumber}</strong>
                  {/* Three distinct states, so an abandoned order is never mistaken for
                      one waiting on her to check the balance. */}
                  {order.paymentMethod === 1 && order.paymentStatus !== 1 && order.status !== 'Cancelled' && (
                    order.customerConfirmedPaymentAtUtc
                      ? <span className="order-tag order-tag-awaiting">{t('customerSaysPaid')}</span>
                      : <span className="order-tag order-tag-unconfirmed">{t('awaitingConfirmation')}</span>
                  )}
                  <span className={order.isGuest ? 'order-tag order-tag-guest' : 'order-tag'}>
                    {order.isGuest ? t('guest') : t('customer')}
                  </span>
                  <strong className="admin-order-total">
                    {/* The amount the customer was asked to pay; lari beside it for a dollar order. */}
                    {formatAmount(order.totalInCurrency, order.currency)}
                    {order.currency === 'USD' && <span className="admin-order-usd"> ({lari(order.total)})</span>}
                  </strong>
                </div>
                <span className="order-payment">
                  {order.paymentMethod === 0
                    ? t('payCash')
                    : `${t('payBankTransfer')} (${order.transferBank === 0 ? t('bankTbc') : t('bankBog')})`}
                  {' · '}
                  <strong className={order.paymentStatus === 1 ? 'payment-paid' : 'payment-unpaid'}>
                    {order.paymentStatus === 1 ? t('paid') : t('unpaid')}
                  </strong>
                </span>
                <div className="admin-order-details">
                  <span className="admin-order-name">{order.customerFirstName} {order.customerLastName}</span>
                  <span>{order.customerPhone}</span>
                  <span>{order.customerEmail || order.userEmail}</span>
                  <span className="admin-order-address">{order.shippingAddress}</span>
                  <span>{new Date(order.createdAtUtc).toLocaleDateString()} · {order.items.length} {t('orderItems')}</span>
                </div>
              </div>
              <div className="admin-order-status">
                <span className={`order-status status-${order.status.toLowerCase()}`}>
                  {t(order.status.toLowerCase() as never)}
                </span>
                <select
                  value={order.status}
                  onChange={e => changeStatus(order.id, e.target.value as OrderStatus)}
                  aria-label={t('orderStatus')}
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{t(s.toLowerCase() as never)}</option>
                  ))}
                </select>
                {order.paymentStatus !== 1 && (
                  <button className="btn btn-outline btn-sm" onClick={() => markPaid(order.id)}>
                    {t('markPaid')}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
