import { LayoutDashboard, Package, Palette, Settings, ShoppingBag, Tags } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';

export function AdminLayout() {
  const { t } = useI18n();
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    api.dashboard().then(stats => setPendingOrders(stats.pendingOrders ?? 0)).catch(() => setPendingOrders(0));
  }, []);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <NavLink className="logo" to="/">
          <img src="/Sofio_Logo.jpg" alt="Sofio Logo" style={{ height: '40px', objectFit: 'contain' }} />
          Sofio Style
        </NavLink>
        <nav>
          <NavLink to="/admin" end><LayoutDashboard size={18} />{t('dashboard')}</NavLink>
          <NavLink to="/admin/products"><Package size={18} />{t('products')}</NavLink>
          <NavLink to="/admin/categories"><Tags size={18} />{t('categories')}</NavLink>
          <NavLink to="/admin/colors"><Palette size={18} />{t('colors')}</NavLink>
          <NavLink to="/admin/orders">
            <ShoppingBag size={18} />
            {t('orders')}
            {pendingOrders > 0 && (
              <span className="nav-badge" title={t('newOrders')} aria-label={t('newOrders')}>
                {pendingOrders}
              </span>
            )}
          </NavLink>
          <NavLink to="/admin/settings"><Settings size={18} />{t('settings')}</NavLink>
        </nav>
      </aside>
      <section className="admin-content">
        <Outlet />
      </section>
    </div>
  );
}
