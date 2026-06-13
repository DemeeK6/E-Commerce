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
                <strong>{t('orderId')}{order.id}</strong>
                <span>{order.userEmail}</span>
                <span>{new Date(order.createdAtUtc).toLocaleDateString()}</span>
                <span>{order.items.length} {t('orderItems')}</span>
                <strong>{money(order.total)}</strong>
              </div>
              <div className="admin-order-status">
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
