import { useEffect, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { Order, OrderStatus } from '../types';
import { money } from '../utils/format';

const STATUSES: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

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
      {orders.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>{t('noOrders')}</p>
      ) : (
        <div className="admin-table">
          {orders.map(order => (
            <article className="admin-row admin-order-row" key={order.id}>
              <div className="admin-order-info">
                <strong>
                  {t('orderId')}{order.id}
                  <span className={order.isGuest ? 'order-tag order-tag-guest' : 'order-tag'}>
                    {order.isGuest ? t('guest') : t('customer')}
                  </span>
                </strong>
                <span>{order.customerFirstName} {order.customerLastName}</span>
                <span>{order.customerPhone}</span>
                <span>{order.customerEmail || order.userEmail}</span>
                <span className="admin-order-address">{order.shippingAddress}</span>
                <span>{new Date(order.createdAtUtc).toLocaleDateString()}</span>
                <span>{order.items.length} {t('orderItems')}</span>
                <strong>{money(order.total)}</strong>
              </div>
              <div className="admin-order-status">
                <span className="order-payment">
                  {order.paymentMethod === 0 ? t('payCash') : t('payBankTransfer')}
                  {' · '}
                  <strong className={order.paymentStatus === 1 ? 'payment-paid' : 'payment-unpaid'}>
                    {order.paymentStatus === 1 ? t('paid') : t('unpaid')}
                  </strong>
                </span>
                {order.paymentStatus !== 1 && (
                  <button className="btn btn-outline btn-sm" onClick={() => markPaid(order.id)}>
                    {t('markPaid')}
                  </button>
                )}
                <span className={`order-status status-${order.status.toLowerCase()}`}>
                  {t(order.status.toLowerCase() as never)}
                </span>
                <select
                  value={order.status}
                  onChange={e => changeStatus(order.id, e.target.value as OrderStatus)}
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{t(s.toLowerCase() as never)}</option>
                  ))}
                </select>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
