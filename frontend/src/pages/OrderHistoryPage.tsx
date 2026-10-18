import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { Order } from '../types';
import { money } from '../utils/format';

export function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    api.orders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <section className="section order-history-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t('customerProfile')}</p>
          <h1>{t('orderHistory')}</h1>
        </div>
        <Link className="btn btn-outline" to="/profile">{t('profile')}</Link>
      </div>
      {orders.length === 0 ? (
        <div className="empty-state">
          <p>{t('noOrders')}</p>
          <Link className="btn btn-dark" to="/products">{t('continueShopping')}</Link>
        </div>
      ) : (
        <div className="order-list">
          {orders.map(order => (
            <article className="order-card" key={order.id}>
              <header className="order-card-header">
                <strong>{t('orderId')} {order.orderNumber}</strong>
                <span className={`order-status status-${order.status.toLowerCase()}`}>
                  {t(order.status.toLowerCase() as never)}
                </span>
                <span>{new Date(order.createdAtUtc).toLocaleDateString()}</span>
                <strong>{money(order.total)}</strong>
              </header>
              <ul className="order-items">
                {order.items.map(item => (
                  <li key={item.id}>
                    {item.productName} × {item.quantity}
                    {item.size && <span> · {item.size}</span>}
                    {item.color && <span> · {item.color}</span>}
                    <span> — {money(item.unitPrice * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
