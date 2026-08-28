import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';

// Explicit order and destination per stat. Rendering straight from the API
// object left the cards in JSON key order with labels like "product Count".
// A stat with no `to` is shown but not clickable - there is no carts screen.
const STATS = [
  { key: 'productCount', label: 'products', to: '/admin/products' },
  { key: 'activeProducts', label: 'activeProducts', to: '/admin/products' },
  { key: 'categoryCount', label: 'categories', to: '/admin/categories' },
  { key: 'orderCount', label: 'orders', to: '/admin/orders' },
  { key: 'pendingOrders', label: 'pendingOrders', to: '/admin/orders' },
  { key: 'togglesEnabled', label: 'togglesEnabled', to: '/admin/settings' },
  { key: 'carts', label: 'carts', to: null },
] as const;

export function AdminDashboardPage() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const { t } = useI18n();

  useEffect(() => {
    api.dashboard().then(setStats).catch(() => setStats({}));
  }, []);

  return (
    <div>
      <div className="admin-heading">
        <p className="eyebrow">{t('storeControl')}</p>
        <h1>{t('dashboard')}</h1>
      </div>
      <div className="stat-grid">
        {STATS.filter(stat => stat.key in stats).map(stat => {
          const body = (
            <>
              <span>{t(stat.label)}</span>
              <strong>{stats[stat.key]}</strong>
            </>
          );

          return stat.to ? (
            <Link className="stat-card stat-card-link" key={stat.key} to={stat.to}>
              {body}
            </Link>
          ) : (
            <article className="stat-card" key={stat.key}>{body}</article>
          );
        })}
      </div>
    </div>
  );
}
