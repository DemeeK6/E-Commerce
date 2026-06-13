import { LayoutDashboard, Package, Settings, ShoppingBag, Tags } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';

export function AdminLayout() {
  const { t } = useI18n();
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
          <NavLink to="/admin/orders"><ShoppingBag size={18} />{t('orders')}</NavLink>
          <NavLink to="/admin/settings"><Settings size={18} />{t('settings')}</NavLink>
        </nav>
      </aside>
      <section className="admin-content">
        <Outlet />
      </section>
    </div>
  );
}
